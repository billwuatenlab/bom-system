import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'bom-system-secret-key';

// POST login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.status !== 'active') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

// GET all users (admin only)
router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
  });
  res.json(users);
});

// POST create user
router.post('/', async (req, res) => {
  const { email, name, password, role } = req.body;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, passwordHash, role: role || 'viewer' },
    });
    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT update user
router.put('/:id', async (req, res) => {
  const { name, role, status } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { name, role, status },
    });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, status: user.status });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
