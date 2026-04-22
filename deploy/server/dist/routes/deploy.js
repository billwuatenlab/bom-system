import { Router } from 'express';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../index.js';
const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../../');
// GET deploy status
router.get('/status', (_req, res) => {
    try {
        const gitStatus = execSync('git log --oneline -1 2>/dev/null || echo "no git"', { cwd: PROJECT_ROOT }).toString().trim();
        res.json({ lastDeploy: gitStatus, ready: true });
    }
    catch {
        res.json({ lastDeploy: null, ready: true });
    }
});
// POST trigger deploy
router.post('/', async (req, res) => {
    try {
        const steps = [];
        // Step 1: Build client
        try {
            const clientOut = execSync('npm run build', { cwd: path.join(PROJECT_ROOT, 'client'), timeout: 120000 }).toString();
            steps.push({ step: '前端建置 / Build frontend', status: 'success', output: clientOut.slice(-200) });
        }
        catch (e) {
            steps.push({ step: '前端建置 / Build frontend', status: 'failed', output: e.stderr?.toString()?.slice(-300) });
            return res.status(500).json({ success: false, steps });
        }
        // Step 2: Build server
        try {
            const serverOut = execSync('npm run build', { cwd: path.join(PROJECT_ROOT, 'server'), timeout: 60000 }).toString();
            steps.push({ step: '後端建置 / Build backend', status: 'success', output: serverOut.slice(-200) });
        }
        catch (e) {
            steps.push({ step: '後端建置 / Build backend', status: 'failed', output: e.stderr?.toString()?.slice(-300) });
            return res.status(500).json({ success: false, steps });
        }
        // Step 3: Run DB migration
        try {
            const dbOut = execSync('npx prisma db push 2>&1', { cwd: path.join(PROJECT_ROOT, 'server'), timeout: 60000 }).toString();
            steps.push({ step: '資料庫遷移 / DB migration', status: 'success', output: dbOut.slice(-200) });
        }
        catch (e) {
            steps.push({ step: '資料庫遷移 / DB migration', status: 'warning', output: e.message?.slice(-200) });
        }
        // Log the deploy
        await prisma.operationLog.create({
            data: {
                action: 'DEPLOY',
                target: 'System',
                detail: JSON.stringify({ steps, timestamp: new Date().toISOString() }),
                userId: req.body?._operatorId || null,
            },
        });
        steps.push({ step: '部署完成 / Deploy complete', status: 'success' });
        res.json({ success: true, steps });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
export default router;
