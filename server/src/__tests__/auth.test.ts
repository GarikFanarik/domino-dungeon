import request from 'supertest';

jest.mock('../../../src/lib/prisma', () => ({
  default: {
    leaderboardEntry: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

import { app } from '../index';

// We need to mock the Discord token exchange HTTP call
// Install node-fetch or use the global fetch (Node 18+)

describe('POST /api/auth/token', () => {
  it('returns 400 when code is missing', async () => {
    const res = await request(app).post('/api/auth/token').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when code is empty string', async () => {
    const res = await request(app).post('/api/auth/token').send({ code: '' });
    expect(res.status).toBe(400);
  });
});
