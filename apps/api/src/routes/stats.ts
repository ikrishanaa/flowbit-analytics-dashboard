import { Router } from 'express';
import dayjs from 'dayjs';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const now = dayjs();
    const startOfYear = now.startOf('year').toDate();

    const [totalInvoices, documentsUploaded, spendYTD, avgValue] = await Promise.all([
      prisma.invoice.count(),
      prisma.document.count(),
      prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        where: {
          invoiceDate: { gte: startOfYear },
          totalAmount: { gt: 0 },
        },
      }),
      prisma.invoice.aggregate({
        _avg: { totalAmount: true },
        where: { totalAmount: { gt: 0 } },
      }),
    ]);

    res.json({
      totalSpendYTD: Number(spendYTD._sum.totalAmount ?? 0),
      totalInvoicesProcessed: totalInvoices,
      documentsUploaded,
      averageInvoiceValue: Number(avgValue._avg.totalAmount ?? 0),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to compute stats' });
  }
});

export default router;
