import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/top10', async (_req, res) => {
  try {
    const rows: Array<{ vendor: string; spend: number }> = await prisma.$queryRaw`
      SELECT v.name AS vendor,
             COALESCE(SUM(CASE WHEN i."totalAmount" > 0 THEN i."totalAmount" ELSE 0 END), 0)::float AS spend
      FROM "Invoice" i
      LEFT JOIN "Vendor" v ON v.id = i."vendorId"
      GROUP BY v.name
      ORDER BY spend DESC NULLS LAST
      LIMIT 10;
    `;

    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load top vendors' });
  }
});

export default router;
