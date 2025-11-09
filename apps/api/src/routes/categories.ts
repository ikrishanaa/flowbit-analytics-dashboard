import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { getAuth } from '../lib/auth';

const router = Router();

router.get('/', async (req, res) => {
  try {
const { role } = getAuth(req);
    const rows: Array<{ category: string; amount: number }> = await prisma.$queryRaw`
      SELECT COALESCE(li.category, 'Uncategorized') AS category,
             COALESCE(SUM(ABS(li."totalPrice")), 0)::float AS amount
      FROM "LineItem" li
      GROUP BY category
      ORDER BY amount DESC;
    `;

    res.json(role === 'admin' ? rows : rows.map(r => ({ ...r, amount: 0 })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load category spend' });
  }
});

export default router;
