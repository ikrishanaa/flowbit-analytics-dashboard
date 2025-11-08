import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt((req.query.pageSize as string) || '20', 10), 1), 100);
    const sort = (req.query.sort as string) || 'invoiceDate:desc';

    const [sortField, sortDir] = sort.split(':');

    const where: any = q
      ? {
          OR: [
            { invoiceNumber: { contains: q, mode: 'insensitive' } },
            { vendor: { name: { contains: q, mode: 'insensitive' } } as any },
            { customer: { name: { contains: q, mode: 'insensitive' } } as any },
          ],
        }
      : {};

    const total = await prisma.invoice.count({ where });

    const items = await prisma.invoice.findMany({
      where,
      include: { vendor: true },
      orderBy: [{ [sortField || 'invoiceDate']: (sortDir === 'asc' ? 'asc' : 'desc') as any }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const mapped = items.map((i) => ({
      id: i.id,
      vendor: i.vendor?.name || null,
      invoiceDate: i.invoiceDate,
      invoiceNumber: i.invoiceNumber,
      amount: i.totalAmount,
      status: i.status,
    }));

    res.json({ page, pageSize, total, items: mapped });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load invoices' });
  }
});

export default router;
