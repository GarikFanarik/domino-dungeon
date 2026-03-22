import path from 'path';
import fs from 'fs';
import request from 'supertest';
import type { Express } from 'express';

const distClientDir = path.resolve(__dirname, '../../../dist/client');

jest.mock('../../../src/lib/prisma', () => ({
  default: {
    leaderboardEntry: { findMany: jest.fn().mockResolvedValue([]) },
  },
}));

describe('Production static serving', () => {
  let app: Express;
  const originalEnv = process.env.NODE_ENV;
  const originalMemStore = process.env.USE_MEMORY_STORE;

  beforeAll(() => {
    fs.mkdirSync(distClientDir, { recursive: true });
    fs.writeFileSync(
      path.join(distClientDir, 'index.html'),
      '<html><body id="root"></body></html>'
    );
    process.env.NODE_ENV = 'production';
    process.env.USE_MEMORY_STORE = 'true';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    app = require('../index').app;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
    process.env.USE_MEMORY_STORE = originalMemStore;
    fs.rmSync(distClientDir, { recursive: true, force: true });
  });

  it('serves index.html for unknown SPA routes in production', async () => {
    const res = await request(app).get('/dungeon-map');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<html>');
  });

  it('still serves /health in production', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
