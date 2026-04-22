/**
 * SQLite → MSSQL 資料遷移腳本 / Data Migration Script
 *
 * 使用方式 / Usage:
 *   cd server
 *   npx tsx src/migrate-to-mssql.ts
 *
 * 前置條件 / Prerequisites:
 *   1. MSSQL 已建好 BOM 資料庫 / BOM database created in MSSQL
 *   2. .env 已設定 DATABASE_URL / DATABASE_URL configured in .env
 *   3. 已執行 npx prisma db push / Prisma schema pushed to MSSQL
 *   4. 安裝 better-sqlite3: npm install better-sqlite3 @types/better-sqlite3
 */

import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQLITE_PATH = path.resolve(__dirname, '../prisma/dev.db');

const prisma = new PrismaClient();

async function migrate() {
  console.log('=== SQLite → MSSQL 資料遷移開始 / Migration Start ===\n');

  const sqlite = new Database(SQLITE_PATH, { readonly: true });

  // --- 1. Users ---
  console.log('📦 遷移使用者 / Migrating users...');
  const users = sqlite.prepare('SELECT * FROM User').all() as any[];
  let userCount = 0;
  for (const u of users) {
    try {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          email: u.email,
          name: u.name,
          passwordHash: u.passwordHash,
          role: u.role || 'viewer',
          status: u.status || 'active',
          createdAt: new Date(u.createdAt),
        },
      });
      userCount++;
    } catch (e: any) {
      console.error(`  ❌ User ${u.email}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${userCount} / ${users.length} 筆使用者完成\n`);

  // --- 2. Materials ---
  console.log('📦 遷移物料 / Migrating materials...');
  const materials = sqlite.prepare('SELECT * FROM Material').all() as any[];
  let matCount = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < materials.length; i += BATCH_SIZE) {
    const batch = materials.slice(i, i + BATCH_SIZE);
    for (const m of batch) {
      try {
        await prisma.material.upsert({
          where: { id: m.id },
          update: {},
          create: {
            id: m.id,
            name: m.name,
            specification: m.specification,
            unit: m.unit,
            category: m.category,
            description: m.description,
            stockQty: m.stockQty || 0,
            safetyStock: m.safetyStock || 0,
            status: m.status,
            projectCode: m.projectCode,
            applicant: m.applicant,
            purpose: m.purpose,
            oldPartNumber: m.oldPartNumber,
            costCurrency: m.costCurrency,
            costPrice: m.costPrice,
            supplier: m.supplier,
            leadTime: m.leadTime,
            paymentTerms: m.paymentTerms,
            partAttribute: m.partAttribute,
            accountingCat: m.accountingCat,
            warehouse: m.warehouse,
            imageUrl: m.imageUrl,
            documents: m.documents,
            createdAt: new Date(m.createdAt),
          },
        });
        matCount++;
      } catch (e: any) {
        console.error(`  ❌ Material ${m.id}: ${e.message}`);
      }
    }
    console.log(`  進度 / Progress: ${Math.min(i + BATCH_SIZE, materials.length)} / ${materials.length}`);
  }
  console.log(`  ✅ ${matCount} / ${materials.length} 筆物料完成\n`);

  // --- 3. BOM Relations ---
  console.log('📦 遷移 BOM 關係 / Migrating BOM relations...');
  const bomRelations = sqlite.prepare('SELECT * FROM BomRelation').all() as any[];
  let bomCount = 0;
  for (const r of bomRelations) {
    try {
      await prisma.bomRelation.create({
        data: {
          parentId: r.parentId,
          childId: r.childId,
          quantity: r.quantity,
          unit: r.unit,
          level: r.level,
        },
      });
      bomCount++;
    } catch (e: any) {
      // Skip duplicates
      if (!e.message.includes('Unique')) {
        console.error(`  ❌ BomRelation ${r.parentId}->${r.childId}: ${e.message}`);
      }
    }
  }
  console.log(`  ✅ ${bomCount} / ${bomRelations.length} 筆 BOM 關係完成\n`);

  // --- 4. Inventory Transactions ---
  console.log('📦 遷移庫存交易 / Migrating inventory transactions...');
  const transactions = sqlite.prepare('SELECT * FROM InventoryTransaction').all() as any[];
  let txCount = 0;
  for (const t of transactions) {
    try {
      await prisma.inventoryTransaction.create({
        data: {
          materialId: t.materialId,
          type: t.type,
          quantity: t.quantity,
          operator: t.operator,
          remark: t.remark,
          createdAt: new Date(t.createdAt),
        },
      });
      txCount++;
    } catch (e: any) {
      console.error(`  ❌ Transaction ${t.id}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${txCount} / ${transactions.length} 筆交易完成\n`);

  // --- 5. Operation Logs ---
  console.log('📦 遷移操作日誌 / Migrating operation logs...');
  const logs = sqlite.prepare('SELECT * FROM OperationLog').all() as any[];
  let logCount = 0;
  for (const l of logs) {
    try {
      await prisma.operationLog.create({
        data: {
          action: l.action,
          target: l.target,
          detail: l.detail,
          createdAt: new Date(l.createdAt),
          userId: null, // userId may not match after migration
        },
      });
      logCount++;
    } catch (e: any) {
      console.error(`  ❌ Log ${l.id}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${logCount} / ${logs.length} 筆日誌完成\n`);

  // --- 6. Category Meta ---
  console.log('📦 遷移類別設定 / Migrating category meta...');
  const metas = sqlite.prepare('SELECT * FROM CategoryMeta').all() as any[];
  let metaCount = 0;
  for (const m of metas) {
    try {
      await prisma.categoryMeta.upsert({
        where: { code: m.code },
        update: {},
        create: {
          code: m.code,
          displayName: m.displayName,
          description: m.description,
        },
      });
      metaCount++;
    } catch (e: any) {
      console.error(`  ❌ CategoryMeta ${m.code}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${metaCount} / ${metas.length} 筆類別設定完成\n`);

  // --- Summary ---
  console.log('==========================================');
  console.log('  遷移摘要 / Migration Summary');
  console.log('==========================================');
  console.log(`  使用者 / Users:          ${userCount} / ${users.length}`);
  console.log(`  物料 / Materials:        ${matCount} / ${materials.length}`);
  console.log(`  BOM 關係 / Relations:    ${bomCount} / ${bomRelations.length}`);
  console.log(`  庫存交易 / Transactions: ${txCount} / ${transactions.length}`);
  console.log(`  操作日誌 / Logs:         ${logCount} / ${logs.length}`);
  console.log(`  類別設定 / Categories:   ${metaCount} / ${metas.length}`);
  console.log('==========================================');

  sqlite.close();
  await prisma.$disconnect();
  console.log('\n✅ 遷移完成 / Migration complete!');
}

migrate().catch((e) => {
  console.error('❌ 遷移失敗 / Migration failed:', e);
  process.exit(1);
});
