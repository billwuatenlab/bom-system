import { Router } from 'express';
import { prisma } from '../index.js';
const router = Router();
// GET dashboard overview
router.get('/', async (_req, res) => {
    const [totalMaterials, recentTransactions, totalStock] = await Promise.all([
        prisma.material.count(),
        prisma.inventoryTransaction.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: { material: true },
        }),
        prisma.material.aggregate({ _sum: { stockQty: true } }),
    ]);
    // Low stock: use Prisma query instead of raw to avoid BigInt issues
    const allForLowStock = await prisma.material.findMany({
        where: { safetyStock: { gt: 0 } },
    });
    const lowStock = allForLowStock.filter(m => m.stockQty <= m.safetyStock).slice(0, 50);
    // Total value: sum(costPrice * stockQty) converted to TWD
    const allMaterials = await prisma.material.findMany({
        where: { costPrice: { not: null } },
        select: { costPrice: true, costCurrency: true, stockQty: true },
    });
    // Fetch exchange rates for TWD conversion
    let twdRates = { TWD: 1, USD: 31.49, EUR: 37.0, JPY: 0.198, CNY: 4.61 };
    try {
        const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
        const rateData = await rateRes.json();
        if (rateData.rates?.TWD) {
            const usdToTwd = rateData.rates.TWD;
            twdRates = { TWD: 1 };
            for (const cur of ['USD', 'EUR', 'JPY', 'CNY']) {
                twdRates[cur] = usdToTwd / rateData.rates[cur];
            }
        }
    }
    catch { }
    let totalValue = 0;
    for (const m of allMaterials) {
        if (m.costPrice && m.stockQty > 0) {
            const rate = twdRates[(m.costCurrency || 'TWD').toUpperCase()] || 1;
            totalValue += m.costPrice * m.stockQty * rate;
        }
    }
    const inStockCount = await prisma.material.count({ where: { stockQty: { gt: 0 } } });
    res.json({
        totalMaterials,
        totalStock: totalStock._sum.stockQty || 0,
        inStockCount,
        lowStockCount: lowStock.length,
        lowStockMaterials: lowStock,
        recentTransactions,
        totalValue: Math.round(totalValue),
    });
});
export default router;
