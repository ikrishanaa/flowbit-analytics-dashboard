import request from 'supertest';

describe('route registrations respond (not 404)', () => {
  function makeApp() {
    const prismaStub = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      invoice: {
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 0 }, _avg: { totalAmount: 0 } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      document: { count: jest.fn().mockResolvedValue(0) },
      queryLog: { create: jest.fn().mockResolvedValue({}) },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 1, name: 'u', passwordHash: 'h', role: 'ANALYST' }),
        update: jest.fn().mockResolvedValue({ id: 1, name: 'u', passwordHash: 'h', role: 'ANALYST' }),
      },
    } as any;

    return new Promise<any>((resolve) => {
      jest.isolateModules(() => {
        jest.doMock('../src/lib/prisma', () => ({ prisma: prismaStub }));
        const { createApp } = require('../src/app');
        resolve(createApp());
      });
    });
  }

  it('GET endpoints return 200 (or 403 where applicable)', async () => {
    const app = await makeApp();

    const ok200 = ['/stats', '/invoices', '/invoice-trends', '/vendors/top10', '/category-spend', '/cash-outflow', '/openapi.json', '/'];
    for (const path of ok200) {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
    }

    // Chat history forbidden for non-admin (default role)
    const hist = await request(app).get('/chat-history').set('x-role', 'analyst');
    expect(hist.status).toBe(403);

    // POST chat-with-data should be registered and return 500 without VANNA base URL
    const chat = await request(app).post('/chat-with-data').send({ prompt: 'hello' });
    expect(chat.status).toBe(500);
  });
});
