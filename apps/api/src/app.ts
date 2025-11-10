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
import swaggerUi from 'swagger-ui-express';
import openapi from './openapi';
import historyRouter from './routes/history';
import authRouter from './routes/auth';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

  const corsOrigin = process.env.CORS_ORIGIN || '*';
  // Configure CORS: if '*' then reflect request origins and disable credentials; otherwise allow listed origins
  const corsOptions =
    corsOrigin === '*'
      ? { origin: true, credentials: false }
      : { origin: corsOrigin.split(',').map((s) => s.trim()), credentials: false };
  app.use(cors(corsOptions));

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
  app.use('/chat-history', historyRouter);
  app.use('/auth', authRouter);

  // OpenAPI docs
  app.get('/openapi.json', (_req, res) => res.json(openapi));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));

  // Friendly landing page
  app.get('/', (_req, res) => {
    res
      .type('html')
      .send(`<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Flowbit API</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;padding:24px;line-height:1.6}</style></head><body><h1>Flowbit Analytics API</h1><p>Useful links:</p><ul><li><a href="/health">/health</a></li><li><a href="/docs">/docs</a></li><li><a href="/stats">/stats</a></li><li><a href="/invoice-trends">/invoice-trends</a></li></ul></body></html>`);
  });

  return app;
}