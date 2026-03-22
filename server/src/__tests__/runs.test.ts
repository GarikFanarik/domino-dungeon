import request from 'supertest';

jest.mock('../../../src/lib/prisma', () => ({
  default: {
    leaderboardEntry: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

// Mock Redis before importing app so routes never actually connect
jest.mock('../../../src/lib/redis', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      get: jest.fn(async (key: string) => store.get(key) ?? null),
      set: jest.fn(async () => 'OK'),
      del: jest.fn(async () => 1),
      on: jest.fn(),
    },
  };
});

import { app } from '../index';

describe('Run management API', () => {
  describe('POST /api/run/start', () => {
    it('returns 400 when discordUserId is missing', async () => {
      const res = await request(app).post('/api/run/start').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('returns 400 when discordUserId is empty', async () => {
      const res = await request(app).post('/api/run/start').send({ discordUserId: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/run/:runId', () => {
    it('returns 404 for unknown runId', async () => {
      const res = await request(app).get('/api/run/nonexistent-run-id');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/run/active', () => {
    it('returns null when no active run', async () => {
      const res = await request(app)
        .get('/api/run/active')
        .set('x-discord-user-id', 'test-user-123');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ runId: null });
    });
  });
});
