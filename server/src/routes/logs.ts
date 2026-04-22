import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

// GET operation logs
router.get('/', async (req, res) => {
  const { action, target, limit } = req.query;
  const where: any = {};
  if (action) where.action = action;
  if (target) where.target = { contains: String(target) };

  const logs = await prisma.operationLog.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: Number(limit) || 200,
  });
  res.json(logs);
});

export default router;
