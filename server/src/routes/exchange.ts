import { Router } from 'express';

const router = Router();

interface RateCache {
  rates: Record<string, number>;
  twdRates: Record<string, number>;
  updatedAt: string;
}

let cache: RateCache | null = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const TARGET_CURRENCIES = ['USD', 'EUR', 'JPY', 'CNY'];

async function fetchRates(): Promise<RateCache> {
  // Check cache
  if (cache && Date.now() - cacheTime < CACHE_TTL) return cache;

  // Fetch USD-based rates
  const res = await fetch('https://open.er-api.com/v6/latest/USD');
  const data = await res.json();

  if (!data.rates?.TWD) throw new Error('Cannot fetch TWD rate');

  const usdToTwd = data.rates.TWD; // e.g. 31.49

  // Calculate: 1 foreign currency = ? TWD
  const twdRates: Record<string, number> = {};
  const rates: Record<string, number> = {};

  for (const cur of TARGET_CURRENCIES) {
    const usdToForeign = data.rates[cur]; // e.g. USD -> JPY = 159
    // 1 foreign = (1 / usdToForeign) USD = (1 / usdToForeign) * usdToTwd TWD
    twdRates[cur] = usdToTwd / usdToForeign;
    rates[cur] = usdToForeign;
  }
  twdRates['TWD'] = 1;
  rates['TWD'] = usdToTwd;

  cache = {
    rates,
    twdRates, // 1 unit of foreign currency = X TWD
    updatedAt: new Date().toISOString(),
  };
  cacheTime = Date.now();
  return cache;
}

// GET exchange rates
router.get('/', async (_req, res) => {
  try {
    const data = await fetchRates();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST convert amount to TWD
router.post('/convert', async (req, res) => {
  try {
    const { amount, from } = req.body;
    if (!amount || !from) return res.status(400).json({ error: 'amount and from are required' });

    const data = await fetchRates();
    const rate = data.twdRates[from.toUpperCase()];
    if (!rate) return res.status(400).json({ error: `Unknown currency: ${from}` });

    const twdAmount = amount * rate;
    res.json({ from, amount, rate, twd: Math.round(twdAmount * 100) / 100 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
