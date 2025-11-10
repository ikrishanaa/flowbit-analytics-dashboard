describe('Prisma singleton', () => {
  const originalEnv = process.env.NODE_ENV;
  beforeEach(() => {
    // Ensure non-production so global cache is used
    process.env.NODE_ENV = 'test';
    // @ts-ignore
    global.prisma = undefined;
    jest.resetModules();
  });
  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
    // @ts-ignore
    delete (global as any).prisma;
  });

  it('creates only one PrismaClient instance across imports', () => {
    const ctor = jest.fn(() => ({ $connect: jest.fn(), $disconnect: jest.fn() }));
    jest.doMock('@prisma/client', () => ({ PrismaClient: ctor }));

    jest.isolateModules(() => {
      const m1 = require('../src/lib/prisma');
      const p1 = m1.prisma;
      const m2 = require('../src/lib/prisma');
      const p2 = m2.prisma;
      expect(p1).toBe(p2);
    });

    expect(ctor).toHaveBeenCalledTimes(1);
  });
});
