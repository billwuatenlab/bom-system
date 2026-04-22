import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

// GET transactions (with optional filter)
router.get('/', async (req, res) => {
  const { materialId, type } = req.query;
  const where: any = {};
  if (materialId) where.materialId = materialId;
  if (type) where.type = type;

  const transactions = await prisma.inventoryTransaction.findMany({
    where,
    include: { material: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(transactions);
});

// POST create transaction (IN / OUT)
router.post('/', async (req, res) => {
  const { materialId, type, quantity, operator, remark } = req.body;

  if (!['IN', 'OUT'].includes(type)) {
    return res.status(400).json({ error: 'Type must be IN or OUT' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const material = await tx.material.findUnique({ where: { id: materialId } });
      if (!material) throw new Error('Material not found');

      if (type === 'OUT' && material.stockQty < quantity) {
        throw new Error('Insufficient stock');
      }

      const transaction = await tx.inventoryTransaction.create({
        data: { materialId, type, quantity, operator, remark },
      });

      await tx.material.update({
        where: { id: materialId },
        data: {
          stockQty: type === 'IN' ? material.stockQty + quantity : material.stockQty - quantity,
        },
      });

      await tx.operationLog.create({
        data: {
          action: type === 'IN' ? 'INBOUND' : 'OUTBOUND',
          target: `Material:${materialId}`,
          detail: JSON.stringify({ materialId, type, quantity, operator, remark }),
          userId: req.body._operatorId || null,
        },
      });

      return transaction;
    });

    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
