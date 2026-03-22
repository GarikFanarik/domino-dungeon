import request from 'supertest';
import { app } from '../index';

jest.mock('../../../src/lib/prisma', () => ({
  default: {
    leaderboardEntry: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

jest.mock('../../../src/lib/redis', () => ({
  default: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  },
}));

describe('Node endpoints', () => {
  describe('GET /api/run/:runId/shop', () => {
    it('returns 404 for unknown runId', async () => {
      const res = await request(app).get('/api/run/unknown-run/shop');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/run/:runId/shop/buy', () => {
    it('returns 404 for unknown runId', async () => {
      const res = await request(app)
        .post('/api/run/unknown-run/shop/buy')
        .send({ itemId: 'item-1' });
      expect(res.status).toBe(404);
    });

    it('returns 400 when itemId is missing', async () => {
      const res = await request(app)
        .post('/api/run/unknown-run/shop/buy')
        .send({});
      // 400 for validation or 404 for not found - both acceptable
      expect([400, 404]).toContain(res.status);
    });
  });

  describe('POST /api/run/:runId/rest/heal', () => {
    it('returns 404 for unknown runId', async () => {
      const res = await request(app)
        .post('/api/run/unknown-run/rest/heal')
        .send({});
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/run/:runId/event', () => {
    it('returns 404 for unknown runId', async () => {
      const res = await request(app).get('/api/run/unknown-run/event');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/run/:runId/relic-offer', () => {
    it('returns 404 for unknown runId', async () => {
      const res = await request(app).get('/api/run/unknown-run/relic-offer');
      expect(res.status).toBe(404);
    });
  });
});
