import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    // Create admin user
    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
        where: { email: 'admin@bom.local' },
        update: {},
        create: {
            email: 'admin@bom.local',
            name: 'Admin',
            passwordHash,
            role: 'admin',
        },
    });
    // Create sample materials
    const materials = [
        { id: 'PCB-001', name: '主板 PCB', unit: 'pcs', category: '電路板', stockQty: 100, safetyStock: 20 },
        { id: 'IC-001', name: '微控制器 MCU', unit: 'pcs', category: 'IC', stockQty: 500, safetyStock: 100 },
        { id: 'RES-001', name: '電阻 10KΩ', unit: 'pcs', category: '被動元件', stockQty: 5000, safetyStock: 1000 },
        { id: 'CAP-001', name: '電容 100µF', unit: 'pcs', category: '被動元件', stockQty: 3000, safetyStock: 500 },
        { id: 'CON-001', name: 'USB 接頭', unit: 'pcs', category: '連接器', stockQty: 200, safetyStock: 50 },
        { id: 'ASM-001', name: '控制板組件', unit: 'pcs', category: '組件', stockQty: 50, safetyStock: 10 },
    ];
    for (const m of materials) {
        await prisma.material.upsert({ where: { id: m.id }, update: {}, create: m });
    }
    // Create BOM relations (ASM-001 → PCB-001, IC-001, RES-001, CAP-001, CON-001)
    const relations = [
        { parentId: 'ASM-001', childId: 'PCB-001', quantity: 1, level: 1 },
        { parentId: 'ASM-001', childId: 'IC-001', quantity: 2, level: 1 },
        { parentId: 'ASM-001', childId: 'RES-001', quantity: 10, level: 1 },
        { parentId: 'ASM-001', childId: 'CAP-001', quantity: 5, level: 1 },
        { parentId: 'ASM-001', childId: 'CON-001', quantity: 1, level: 1 },
    ];
    for (const r of relations) {
        await prisma.bomRelation.upsert({
            where: { parentId_childId: { parentId: r.parentId, childId: r.childId } },
            update: {},
            create: r,
        });
    }
    console.log('Seed completed.');
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
