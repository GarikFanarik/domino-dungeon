import request from 'supertest';

jest.mock('../../../src/lib/prisma', () => ({
  default: {
    leaderboardEntry: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

// Mock Redis before importing app so routes never actually connect
const redisStore = new Map<string, string>();
jest.mock('../../../src/lib/redis', () => {
  return {
    __esModule: true,
    default: {
      get: jest.fn(async (key: string) => redisStore.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => { redisStore.set(key, value); return 'OK'; }),
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

    it('returns playerState.relics populated from run.relics', async () => {
      const runId = 'test-relic-run-id';
      const runState = {
        run: {
          id: runId,
          userId: 'user-1',
          seed: 'seed-1',
          currentAct: 1,
          currentNodeId: null,
          status: 'ACTIVE',
          hp: 80,
          maxHp: 80,
          gold: 0,
          relics: ['cracked-shield', 'lucky-pip'],
          completedAt: null,
          createdAt: new Date().toISOString(),
        },
        playerState: { hp: { current: 80, max: 80 }, armor: 0, armorFortified: false, gold: 0, relics: [] },
        map: [],
        currentNodeId: null,
      };
      redisStore.set(`run:${runId}`, JSON.stringify(runState));

      const res = await request(app).get(`/api/run/${runId}`);
      expect(res.status).toBe(200);
      expect(res.body.playerState.relics).toEqual(['cracked-shield', 'lucky-pip']);
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
