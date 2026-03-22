import request from 'supertest';

jest.mock('../../../src/lib/prisma', () => ({
  default: {
    leaderboardEntry: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

import { app } from '../index';

describe('Express server', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /unknown-route returns 404', async () => {
    const res = await request(app).get('/unknown-route-xyz');
    expect(res.status).toBe(404);
  });

  it('CORS allows discord.com origin', async () => {
    const res = await request(app)
      .options('/health')
      .set('Origin', 'https://discord.com');
    expect(res.headers['access-control-allow-origin']).toBe('https://discord.com');
  });
});
