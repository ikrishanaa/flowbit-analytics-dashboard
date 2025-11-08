import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const rows: Array<{ category: string; amount: number }> = await prisma.$queryRaw`
      SELECT COALESCE(li.category, 'Uncategorized') AS category,
             COALESCE(SUM(ABS(li."totalPrice")), 0)::float AS amount
      FROM "LineItem" li
      GROUP BY category
      ORDER BY amount DESC;
    `;

    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load category spend' });
  }
});

export default router;
