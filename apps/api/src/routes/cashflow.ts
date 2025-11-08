import { Router } from 'express';
import dayjs from 'dayjs';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const startParam = req.query.start as string | undefined;
    const endParam = req.query.end as string | undefined;

    const start = startParam ? dayjs(startParam) : dayjs();
    const end = endParam ? dayjs(endParam) : dayjs().add(90, 'day');

    const rows: Array<{ date: string; outflow: number }> = await prisma.$queryRaw`
      SELECT to_char(d::date, 'YYYY-MM-DD') AS date,
             COALESCE(SUM(CASE WHEN i."totalAmount" > 0 THEN i."totalAmount" ELSE 0 END), 0)::float AS outflow
      FROM generate_series(${start.toDate()}::timestamp, ${end.toDate()}::timestamp, interval '1 day') AS d
      LEFT JOIN "Invoice" i ON i."dueDate"::date = d::date
      GROUP BY 1
      ORDER BY 1 ASC;
    `;

    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load cash outflow forecast' });
  }
});

export default router;
