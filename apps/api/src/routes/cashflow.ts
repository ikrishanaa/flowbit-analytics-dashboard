import { Router } from 'express';
import dayjs from 'dayjs';
import { prisma } from '../lib/prisma';
import { getAuth } from '../lib/auth';

const router = Router();

router.get('/', async (req, res) => {
  try {
const { role } = getAuth(req);
    const startParam = req.query.start as string | undefined;
    const endParam = req.query.end as string | undefined;
    const bucket = String(req.query.bucket || '1') === '1';

    const start = startParam ? dayjs(startParam) : dayjs();
    const end = endParam ? dayjs(endParam) : dayjs().add(90, 'day');

    if (bucket) {
      const thresholds = {
        d7: start.add(7, 'day').toDate(),
        d30: start.add(30, 'day').toDate(),
        d60: start.add(60, 'day').toDate(),
      } as const;

      const row: Array<{ d0_7: number; d8_30: number; d31_60: number; d60_plus: number }> = await prisma.$queryRaw`
        WITH due AS (
          SELECT i."dueDate"::date AS d,
                 CASE WHEN i."totalAmount" > 0 THEN i."totalAmount" ELSE 0 END AS amt
          FROM "Invoice" i
          WHERE i."dueDate" IS NOT NULL
            AND i."dueDate"::date BETWEEN ${start.toDate()}::date AND ${end.toDate()}::date
        )
        SELECT
          COALESCE(SUM(CASE WHEN d <= ${thresholds.d7}::date THEN amt ELSE 0 END), 0)::float AS d0_7,
          COALESCE(SUM(CASE WHEN d > ${thresholds.d7}::date AND d <= ${thresholds.d30}::date THEN amt ELSE 0 END), 0)::float AS d8_30,
          COALESCE(SUM(CASE WHEN d > ${thresholds.d30}::date AND d <= ${thresholds.d60}::date THEN amt ELSE 0 END), 0)::float AS d31_60,
          COALESCE(SUM(CASE WHEN d > ${thresholds.d60}::date THEN amt ELSE 0 END), 0)::float AS d60_plus
        FROM due;
      `;

      const one = row[0] || { d0_7: 0, d8_30: 0, d31_60: 0, d60_plus: 0 } as any;
      const payload = [
        { label: '0 - 7 days', amount: Number(one.d0_7 || 0) },
        { label: '8 - 30 days', amount: Number(one.d8_30 || 0) },
        { label: '31 - 60 days', amount: Number(one.d31_60 || 0) },
        { label: '60+ days', amount: Number(one.d60_plus || 0) },
      ];
      res.json(role === 'admin' ? payload : payload.map(p => ({ ...p, amount: 0 })));
      return;
    }

    const rows: Array<{ date: string; outflow: number }> = await prisma.$queryRaw`
      SELECT to_char(d::date, 'YYYY-MM-DD') AS date,
             COALESCE(SUM(CASE WHEN i."totalAmount" > 0 THEN i."totalAmount" ELSE 0 END), 0)::float AS outflow
      FROM generate_series(${start.toDate()}::timestamp, ${end.toDate()}::timestamp, interval '1 day') AS d
      LEFT JOIN "Invoice" i ON i."dueDate"::date = d::date
      GROUP BY 1
      ORDER BY 1 ASC;
    `;

    res.json(role === 'admin' ? rows : rows.map(r => ({ ...r, outflow: 0 })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load cash outflow forecast' });
  }
});

export default router;
