import express from 'express';
import cors from 'cors';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import materialRoutes from './routes/materials.js';
import bomRoutes from './routes/bom.js';
import inventoryRoutes from './routes/inventory.js';
import userRoutes from './routes/users.js';
import dashboardRoutes from './routes/dashboard.js';
import logRoutes from './routes/logs.js';
import deployRoutes from './routes/deploy.js';
import exchangeRoutes from './routes/exchange.js';

export const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Routes
app.use('/api/materials', materialRoutes);
app.use('/api/bom', bomRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/deploy', deployRoutes);
app.use('/api/exchange', exchangeRoutes);

// Serve frontend production build
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Network info (for QR code)
app.get('/api/network', (_req, res) => {
  const nets = os.networkInterfaces();
  const ips: string[] = [];
  for (const iface of Object.values(nets)) {
    for (const net of iface || []) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  res.json({ ips, port: 5173 });
});

// SPA fallback - serve index.html for non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`BOM Server running on http://localhost:${PORT}`);
});
