import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { prisma } from './lib/prisma';
import statsRouter from './routes/stats';
import invoicesRouter from './routes/invoices';
import trendsRouter from './routes/trends';
import vendorsRouter from './routes/vendors';
import categoriesRouter from './routes/categories';
import cashflowRouter from './routes/cashflow';
import chatRouter from './routes/chat';

const app = express();

app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(
  cors({
    origin: corsOrigin.split(',').map((s) => s.trim()),
    credentials: true,
  })
);

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.use('/stats', statsRouter);
app.use('/invoices', invoicesRouter);
app.use('/invoice-trends', trendsRouter);
app.use('/vendors', vendorsRouter);
app.use('/category-spend', categoriesRouter);
app.use('/cash-outflow', cashflowRouter);
app.use('/chat-with-data', chatRouter);

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
