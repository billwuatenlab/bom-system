import { Router } from 'express';
import { prisma } from '../index.js';
import multer from 'multer';
import * as XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// GET all category display names
router.get('/category-meta', async (_req, res) => {
  const metas = await prisma.categoryMeta.findMany();
  const map: Record<string, { displayName: string; description?: string | null }> = {};
  metas.forEach(m => { map[m.code] = { displayName: m.displayName, description: m.description }; });
  res.json(map);
});

// PUT update category display name
router.put('/category-meta/:code', async (req, res) => {
  const { displayName, description } = req.body;
  try {
    const meta = await prisma.categoryMeta.upsert({
      where: { code: req.params.code },
      update: { displayName, description },
      create: { code: req.params.code, displayName, description },
    });
    await prisma.operationLog.create({
      data: {
        action: 'UPDATE',
        target: `CategoryMeta:${req.params.code}`,
        detail: JSON.stringify({ displayName, description }),
      },
    });
    res.json(meta);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET categories (tree root level)
router.get('/categories', async (req, res) => {
  const search = (req.query.search as string) || '';

  if (search) {
    // Search mode: return matching materials directly
    const materials = await prisma.material.findMany({
      where: {
        OR: [
          { id: { contains: search } },
          { name: { contains: search } },
          { supplier: { contains: search } },
          { projectCode: { contains: search } },
          { oldPartNumber: { contains: search } },
        ],
      },
      take: 200,
      orderBy: { id: 'asc' },
    });
    return res.json({ type: 'search', data: materials });
  }

  // Normal mode: return category groups with stock sum and total cost
  const categories = await prisma.$queryRaw<any[]>`
    SELECT category, COUNT(*) as count,
           COALESCE(SUM(stockQty), 0) as totalStock,
           COALESCE(SUM(CASE WHEN costPrice IS NOT NULL THEN costPrice * stockQty ELSE 0 END), 0) as totalCost
    FROM Material GROUP BY category ORDER BY category
  `;
  const data = categories.map(c => ({
    category: c.category,
    count: Number(c.count),
    totalStock: Number(c.totalStock),
    totalCost: Number(c.totalCost),
  }));
  res.json({ type: 'categories', data });
});

// GET attachment stats per category + per material
router.get('/attachment-stats', async (_req, res) => {
  try {
    const materials = await prisma.material.findMany({
      select: { id: true, category: true, imageUrl: true, documents: true },
    });

    const categories: Record<string, { photoCount: number; docCount: number; totalSize: number }> = {};
    const items: Record<string, { photoCount: number; docCount: number; totalSize: number }> = {};

    for (const m of materials) {
      const cat = m.category || '(未分類)';
      if (!categories[cat]) categories[cat] = { photoCount: 0, docCount: 0, totalSize: 0 };

      let itemPhoto = 0, itemDoc = 0, itemSize = 0;

      if (m.imageUrl) {
        itemPhoto = 1;
        const imgPath = path.resolve(__dirname, '../../uploads', path.basename(m.imageUrl));
        if (fs.existsSync(imgPath)) itemSize += fs.statSync(imgPath).size;
      }

      if (m.documents) {
        const docs = JSON.parse(m.documents);
        itemDoc = docs.length;
        for (const doc of docs) {
          itemSize += doc.size || 0;
        }
      }

      items[m.id] = { photoCount: itemPhoto, docCount: itemDoc, totalSize: itemSize };
      categories[cat].photoCount += itemPhoto;
      categories[cat].docCount += itemDoc;
      categories[cat].totalSize += itemSize;
    }

    res.json({ categories, items });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET materials by category (tree second level)
router.get('/by-category/:category', async (_req, res) => {
  const materials = await prisma.material.findMany({
    where: { category: _req.params.category },
    orderBy: { id: 'asc' },
  });
  res.json(materials);
});

// GET all materials (paginated)
router.get('/', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50));
  const search = (req.query.search as string) || '';
  const category = (req.query.category as string) || '';

  const where: any = {};
  if (search) {
    where.OR = [
      { id: { contains: search } },
      { name: { contains: search } },
      { supplier: { contains: search } },
      { projectCode: { contains: search } },
      { oldPartNumber: { contains: search } },
    ];
  }
  if (category) {
    where.category = category;
  }

  const [materials, total] = await Promise.all([
    prisma.material.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.material.count({ where }),
  ]);

  res.json({ data: materials, total, page, pageSize });
});

// GET single material
router.get('/:id', async (req, res) => {
  const material = await prisma.material.findUnique({ where: { id: req.params.id } });
  if (!material) return res.status(404).json({ error: 'Material not found' });
  res.json(material);
});

// POST create material
router.post('/', async (req, res) => {
  try {
    const material = await prisma.material.create({ data: req.body });
    await prisma.operationLog.create({
      data: {
        action: 'CREATE',
        target: `Material:${material.id}`,
        detail: JSON.stringify(req.body),
        userId: req.body._operatorId || null,
      },
    });
    res.status(201).json(material);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT update material
router.put('/:id', async (req, res) => {
  try {
    const old = await prisma.material.findUnique({ where: { id: req.params.id } });
    const { _operatorId, ...updateData } = req.body;
    const material = await prisma.material.update({
      where: { id: req.params.id },
      data: updateData,
    });
    await prisma.operationLog.create({
      data: {
        action: 'UPDATE',
        target: `Material:${req.params.id}`,
        detail: JSON.stringify({ before: old, after: material }),
        userId: _operatorId || null,
      },
    });
    res.json(material);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE material
router.delete('/:id', async (req, res) => {
  try {
    const old = await prisma.material.findUnique({ where: { id: req.params.id } });
    await prisma.material.delete({ where: { id: req.params.id } });
    await prisma.operationLog.create({
      data: {
        action: 'DELETE',
        target: `Material:${req.params.id}`,
        detail: JSON.stringify(old),
        userId: req.body?._operatorId || null,
      },
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST import from Excel
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(sheet);

    const results = { success: 0, errors: [] as string[] };

    for (const row of rows) {
      try {
        const materialData = {
          id: String(row['新品號'] || row['料號'] || row['PartNumber'] || row['id']),
          name: String(row['品名'] || row['名稱'] || row['Name'] || row['name']),
          specification: row['規格'] || row['Spec'] || row['specification'] || null,
          unit: String(row['單位'] || row['Unit'] || row['unit'] || 'pcs'),
          category: row['品號類別'] || row['分類'] || row['Category'] || row['category'] || null,
          description: row['描述'] || row['Description'] || row['description'] || null,
          stockQty: Number(row['庫存'] || row['Stock'] || row['stockQty'] || 0),
          safetyStock: Number(row['安全庫存'] || row['SafetyStock'] || row['safetyStock'] || 0),
          status: row['狀態'] || null,
          projectCode: row['專案代號'] || null,
          applicant: row['申請人'] || null,
          purpose: row['申請用途'] || null,
          oldPartNumber: row['舊品號'] ? String(row['舊品號']) : null,
          costCurrency: row['成本幣別'] || null,
          costPrice: row['成本價格'] ? parseFloat(String(row['成本價格']).replace(/,/g, '')) || null : null,
          supplier: row['廠商'] || null,
          leadTime: row['交期'] ? String(row['交期']) : null,
          paymentTerms: row['交易條件'] || null,
          partAttribute: row['品號屬性'] || null,
          accountingCat: row['會計科目'] || null,
          warehouse: row['主要庫別'] || null,
        };
        await prisma.material.create({ data: materialData });
        await prisma.operationLog.create({
          data: {
            action: 'IMPORT',
            target: `Material:${materialData.id}`,
            detail: JSON.stringify(materialData),
          },
        });
        results.success++;
      } catch (e: any) {
        results.errors.push(`Row ${row['料號'] || row['id']}: ${e.message}`);
      }
    }

    res.json(results);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST upload image for material
router.post('/:id/image', imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const imageUrl = `/uploads/${req.file.filename}`;
    const material = await prisma.material.update({
      where: { id: req.params.id },
      data: { imageUrl },
    });
    await prisma.operationLog.create({
      data: {
        action: 'UPDATE',
        target: `Material:${req.params.id}`,
        detail: JSON.stringify({ field: 'imageUrl', value: imageUrl }),
      },
    });
    res.json(material);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST upload document for material
router.post('/:id/documents', imageUpload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const docUrl = `/uploads/${req.file.filename}`;
    const material = await prisma.material.findUnique({ where: { id: req.params.id } });
    if (!material) return res.status(404).json({ error: 'Material not found' });

    const existing: any[] = material.documents ? JSON.parse(material.documents) : [];
    existing.push({
      name: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
      url: docUrl,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
    });

    const updated = await prisma.material.update({
      where: { id: req.params.id },
      data: { documents: JSON.stringify(existing) },
    });
    await prisma.operationLog.create({
      data: {
        action: 'UPDATE',
        target: `Material:${req.params.id}`,
        detail: JSON.stringify({ field: 'documents', value: docUrl }),
      },
    });
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE document from material
router.delete('/:id/documents', async (req, res) => {
  try {
    const { url } = req.body;
    const material = await prisma.material.findUnique({ where: { id: req.params.id } });
    if (!material) return res.status(404).json({ error: 'Material not found' });

    const existing: any[] = material.documents ? JSON.parse(material.documents) : [];
    const filtered = existing.filter(d => d.url !== url);

    // Delete physical file
    const filePath = path.resolve(__dirname, '../../uploads', path.basename(url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    const updated = await prisma.material.update({
      where: { id: req.params.id },
      data: { documents: JSON.stringify(filtered) },
    });
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET storage size for a material (image + documents)
router.get('/:id/storage', async (req, res) => {
  try {
    const material = await prisma.material.findUnique({ where: { id: req.params.id } });
    if (!material) return res.status(404).json({ error: 'Material not found' });

    let totalSize = 0;

    // Image size
    if (material.imageUrl) {
      const imgPath = path.resolve(__dirname, '../../uploads', path.basename(material.imageUrl));
      if (fs.existsSync(imgPath)) totalSize += fs.statSync(imgPath).size;
    }

    // Documents size
    const docs: any[] = material.documents ? JSON.parse(material.documents) : [];
    for (const doc of docs) {
      const docPath = path.resolve(__dirname, '../../uploads', path.basename(doc.url));
      if (fs.existsSync(docPath)) totalSize += fs.statSync(docPath).size;
    }

    res.json({ totalSize, imageSize: material.imageUrl ? totalSize - docs.reduce((s, d) => s + (d.size || 0), 0) : 0, docCount: docs.length });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
