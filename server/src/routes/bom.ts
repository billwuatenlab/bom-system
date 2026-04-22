import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();
const MAX_BOM_LEVEL = 9;

// GET BOM tree for a material
router.get('/tree/:materialId', async (req, res) => {
  try {
    const tree = await buildTree(req.params.materialId, 1);
    res.json(tree);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET full BOM tree (all top-level materials)
router.get('/tree', async (_req, res) => {
  // Top-level = materials that are not children of any other material
  const childIds = await prisma.bomRelation.findMany({ select: { childId: true } });
  const childIdSet = new Set(childIds.map((r) => r.childId));
  const allMaterials = await prisma.material.findMany();
  const topLevel = allMaterials.filter((m) => !childIdSet.has(m.id));

  const trees = await Promise.all(topLevel.map((m) => buildTree(m.id, 1)));
  res.json(trees);
});

// POST add BOM relation
router.post('/', async (req, res) => {
  const { parentId, childId, quantity, unit, level } = req.body;
  if (level > MAX_BOM_LEVEL) {
    return res.status(400).json({ error: `BOM level cannot exceed ${MAX_BOM_LEVEL}` });
  }
  try {
    const relation = await prisma.bomRelation.create({
      data: { parentId, childId, quantity, unit, level },
    });
    await prisma.operationLog.create({
      data: {
        action: 'CREATE',
        target: `BomRelation:${relation.id}`,
        detail: JSON.stringify({ parentId, childId, quantity, unit, level }),
        userId: req.body._operatorId || null,
      },
    });
    res.status(201).json(relation);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE BOM relation
router.delete('/:id', async (req, res) => {
  try {
    const old = await prisma.bomRelation.findUnique({ where: { id: Number(req.params.id) } });
    await prisma.bomRelation.delete({ where: { id: Number(req.params.id) } });
    await prisma.operationLog.create({
      data: {
        action: 'DELETE',
        target: `BomRelation:${req.params.id}`,
        detail: JSON.stringify(old),
        userId: req.body?._operatorId || null,
      },
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

async function buildTree(materialId: string, currentLevel: number): Promise<any> {
  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material) return null;

  const children = await prisma.bomRelation.findMany({
    where: { parentId: materialId },
    include: { child: true },
  });

  const childNodes =
    currentLevel < MAX_BOM_LEVEL
      ? await Promise.all(children.map((rel) => buildTree(rel.childId, currentLevel + 1)))
      : [];

  return {
    key: material.id,
    title: `${material.id} - ${material.name}`,
    material,
    level: currentLevel,
    children: childNodes.filter(Boolean),
  };
}

export default router;
