import request from 'supertest';

function getMiddlewareNames(app: any): string[] {
  const stack = app._router?.stack || [];
  return stack
    .filter((l: any) => typeof l?.handle === 'function')
    .map((l: any) => l.handle.name)
    .filter(Boolean);
}

function collectRoutes(app: any): Array<{ method: string; path: string }> {
  const routes: Array<{ method: string; path: string }> = [];
  const stack = app._router?.stack || [];

  const pushRoute = (method: string, path: string) => {
    routes.push({ method: method.toUpperCase(), path });
  };

  const parseMountPath = (layer: any): string => {
    if (!layer || !layer.regexp) return '';
    const str = layer.regexp.toString();
    // Extract the path from layer.regexp like: /^\/(stats)\/?(?=\/|$)/i
    const match = str.match(/^\/\^\\\/(.*?)\\\/?\(\?=\\\/(?:\)\|\$)\)\$\/[a-z]*/i) || str.match(/^\/\^\\\/(.*?)\\\/?\$\/[a-z]*/i);
    if (match && match[1]) {
      return '/' + match[1].replace(/\\\//g, '/');
    }
    return '';
  };

  for (const layer of stack) {
    if (layer.route && layer.route.path) {
      const methods = Object.keys(layer.route.methods || {});
      for (const m of methods) pushRoute(m, layer.route.path);
    } else if (layer.name === 'router' && layer.handle?.stack) {
      const base = parseMountPath(layer);
      for (const s of layer.handle.stack) {
        if (s.route && s.route.path) {
          const methods = Object.keys(s.route.methods || {});
          const sub = s.route.path === '/' ? '' : s.route.path;
          for (const m of methods) pushRoute(m, `${base}${sub}`);
        }
      }
    }
  }

  return routes;
}

describe('createApp initialization', () => {
  it('applies JSON parser, morgan logger, and CORS middleware', () => {
    jest.isolateModules(() => {
      const { createApp } = require('../src/app');
      const app = createApp();
      const names = getMiddlewareNames(app);
      expect(names).toEqual(expect.arrayContaining(['jsonParser', 'logger', 'corsMiddleware']));
    });
  });

});

describe('/health endpoint', () => {
  it('returns ok: true when DB connection is healthy', async () => {
    const app = await new Promise<any>((resolve) => {
      jest.isolateModules(() => {
        jest.doMock('../src/lib/prisma', () => ({
          prisma: { $queryRaw: jest.fn().mockResolvedValue(1) },
        }));
        const { createApp } = require('../src/app');
        resolve(createApp());
      });
    });

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('openapi and root', () => {
  it('serves openapi.json', async () => {
    const app = await new Promise<any>((resolve) => {
      jest.isolateModules(() => {
        const { createApp } = require('../src/app');
        resolve(createApp());
      });
    });
    const res = await request(app).get('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('openapi');
    expect(res.body).toHaveProperty('paths');
  });

  it('serves landing page HTML', async () => {
    const app = await new Promise<any>((resolve) => {
      jest.isolateModules(() => {
        const { createApp } = require('../src/app');
        resolve(createApp());
      });
    });
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });
});
