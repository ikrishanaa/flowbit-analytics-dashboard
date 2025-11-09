import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { getAuth } from '../lib/auth';

const router = Router();

router.get('/', async (req, res) => {
  try {
const { role } = getAuth(req);
    if (role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' });
    }
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);
    const rows = await prisma.queryLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load chat history' });
  }
});

export default router;