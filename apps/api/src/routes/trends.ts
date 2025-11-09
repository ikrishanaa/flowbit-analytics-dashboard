import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { getAuth } from '../lib/auth';

const router = Router();

router.get('/', async (req, res) => {
  try {
const { role } = getAuth(req);
    const rows: Array<{ month: string; invoice_count: number; total_spend: number }> = await prisma.$queryRaw`
      SELECT to_char(date_trunc('month', "invoiceDate"), 'YYYY-MM') AS month,
             COUNT(*)::int AS invoice_count,
             COALESCE(SUM(CASE WHEN "totalAmount" > 0 THEN "totalAmount" ELSE 0 END), 0)::float AS total_spend
      FROM "Invoice"
      WHERE "invoiceDate" IS NOT NULL
      GROUP BY 1
      ORDER BY 1 ASC;
    `;

    const masked = role === 'admin' ? rows : rows.map(r => ({ ...r, total_spend: 0 }));
    res.json(masked);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load trends' });
  }
});

export default router;
