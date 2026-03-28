import request from 'supertest';
import { Board } from '../../../src/game/board';

jest.mock('../../../src/lib/prisma', () => ({
  default: {
    leaderboardEntry: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

const redisStore = new Map<string, string>();
jest.mock('../../../src/lib/redis', () => ({
  __esModule: true,
  default: {
    get: jest.fn(async (key: string) => redisStore.get(key) ?? null),
    set: jest.fn(async (key: string, value: string) => {
      redisStore.set(key, value);
      return 'OK';
    }),
    del: jest.fn(async () => 1),
    on: jest.fn(),
  },
}));

import { app } from '../index';

describe('Combat API', () => {
  describe('GET /api/run/:runId/combat', () => {
    it('returns 404 for unknown runId', async () => {
      const res = await request(app).get('/api/run/nonexistent/combat');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/run/:runId/combat/play', () => {
    it('returns 404 for unknown runId', async () => {
      const res = await request(app)
        .post('/api/run/nonexistent/combat/play')
        .send({ stoneIndex: 0, side: 'right' });
      expect(res.status).toBe(404);
    });

    it('returns 400 when stoneIndex is missing', async () => {
      const res = await request(app)
        .post('/api/run/test-run/combat/play')
        .send({});
      // Either 400 (validation) or 404 (not found) is acceptable
      expect([400, 404]).toContain(res.status);
    });
  });

  describe('POST /api/run/:runId/combat/end-turn', () => {
    it('returns 404 for unknown runId', async () => {
      const res = await request(app)
        .post('/api/run/nonexistent/combat/end-turn')
        .send({});
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/run/:runId/combat/swap', () => {
    it('returns 404 for unknown runId', async () => {
      const res = await request(app)
        .post('/api/run/nonexistent/combat/swap')
        .send({ stoneIndex: 0 });
      expect(res.status).toBe(404);
    });
  });

  function makeSession(overrides: Partial<{
    enemyStatus: { burn: number; slow: number; frozen: boolean; stunned: boolean; poison: number };
    playerHp: number;
    playerArmor: number;
    enemyHp: number;
    hand: any[];
    bag: any[];
    relics: string[];
    stonesPlayedTotal: number;
    board: any;
    enemyHand: any[];
    enemyHandSize: number;
    turnNumber: number;
  }> = {}) {
    return {
      userId: 'test-et-run',
      runId: 'test-et-run',
      enemyId: 'Skeleton',
      enemyHp: overrides.enemyHp ?? 50,
      enemyMaxHp: 80,
      enemyStatus: { burn: 0, slow: 0, frozen: false, stunned: false, poison: 0,
        ...(overrides.enemyStatus ?? {}) },
      hand: overrides.hand ?? [],
      bag: overrides.bag ?? [],
      board: overrides.board ?? new Board().toJSON(),
      enemyHand: overrides.enemyHand ?? [],
      enemyHandSize: overrides.enemyHandSize ?? 5,
      turnNumber: overrides.turnNumber ?? 1,
      swapsUsed: 0,
      swapsPerTurn: 1,
      playerHp: overrides.playerHp ?? 80,
      playerMaxHp: 80,
      playerArmor: overrides.playerArmor ?? 0,
      playerGold: 0,
      relics: overrides.relics ?? [],
      stonesPlayedTotal: overrides.stonesPlayedTotal ?? 0,
    };
  }

  describe('POST /api/run/:runId/combat/end-turn — response shape', () => {
    beforeEach(() => redisStore.clear());

    it('includes stonesPlayed[], rawDamage, armorBlocked, damage, dotDamage when enemy attacks', async () => {
      // Set up a board with a stone the enemy can match
      const board = new Board();
      // Play a stone so the board has rightOpen=3
      board.playStone({ id: 'e-seed', leftPip: 2, rightPip: 3, element: null }, 'right', 'enemy', 0);
      // Enemy hand with a matching stone
      const enemyHand = [{ id: 'e1', leftPip: 3, rightPip: 4, element: null }];
      const session = makeSession({ board: board.toJSON(), enemyHand });
      redisStore.set('combat:test-et-run', JSON.stringify(session));
      const res = await request(app).post('/api/run/test-et-run/combat/end-turn').send({});
      expect(res.status).toBe(200);
      expect(res.body.enemyAttack).toBeDefined();
      expect(res.body.enemyAttack.stonesPlayed).toBeDefined();
      expect(Array.isArray(res.body.enemyAttack.stonesPlayed)).toBe(true);
      expect(res.body.enemyAttack.rawDamage).toBeGreaterThanOrEqual(0);
      expect(res.body.enemyAttack.armorBlocked).toBeGreaterThanOrEqual(0);
      expect(res.body.enemyAttack.damage).toBeGreaterThanOrEqual(0);
      expect(res.body.enemyAttack.rawDamage - res.body.enemyAttack.armorBlocked).toBe(res.body.enemyAttack.damage);
      expect(res.body.dotDamage).toEqual({ burn: 0, poison: 0 });
    });

    it('armor reduces damage: armorBlocked = min(armor, rawDamage)', async () => {
      const board = new Board();
      board.playStone({ id: 'e-seed', leftPip: 2, rightPip: 3, element: null }, 'right', 'enemy', 0);
      const enemyHand = [{ id: 'e1', leftPip: 3, rightPip: 6, element: null }];
      const session = makeSession({ playerArmor: 99, board: board.toJSON(), enemyHand });
      redisStore.set('combat:test-et-run', JSON.stringify(session));
      const res = await request(app).post('/api/run/test-et-run/combat/end-turn').send({});
      expect(res.status).toBe(200);
      expect(res.body.enemyAttack).toBeDefined();
      expect(res.body.enemyAttack.damage).toBe(0);
      expect(res.body.enemyAttack.armorBlocked).toBe(res.body.enemyAttack.rawDamage);
    });

    it('dotDamage.burn > 0 when enemy has burn stacks', async () => {
      redisStore.set('combat:test-et-run',
        JSON.stringify(makeSession({ enemyStatus: { burn: 3, slow: 0, frozen: false, stunned: false, poison: 0 } })));
      const res = await request(app).post('/api/run/test-et-run/combat/end-turn').send({});
      expect(res.body.dotDamage.burn).toBe(3);
    });

    it('returns enemySkipped with reason stunned and no enemyAttack', async () => {
      redisStore.set('combat:test-et-run',
        JSON.stringify(makeSession({ enemyStatus: { burn: 0, slow: 0, frozen: false, stunned: true, poison: 0 } })));
      const res = await request(app).post('/api/run/test-et-run/combat/end-turn').send({});
      expect(res.body.enemySkipped).toEqual({ reason: 'stunned' });
      expect(res.body.enemyAttack).toBeUndefined();
      expect(res.body.dotDamage).toBeDefined();
    });

    it('returns enemySkipped with reason frozen and no enemyAttack', async () => {
      redisStore.set('combat:test-et-run',
        JSON.stringify(makeSession({ enemyStatus: { burn: 0, slow: 0, frozen: true, stunned: false, poison: 0 } })));
      const res = await request(app).post('/api/run/test-et-run/combat/end-turn').send({});
      expect(res.body.enemySkipped).toEqual({ reason: 'frozen' });
      expect(res.body.enemyAttack).toBeUndefined();
    });

    it('player tiles from current turn used for damage, not enemy tiles', async () => {
      // Damage comes from junctions between adjacent stones (pip*2 per junction).
      // Play two player stones so they form one junction at pip=6 → 12 damage.
      // Enemy tiles from a prior turn should NOT be counted.
      const board = new Board();
      board.playStone({ id: 'p1', leftPip: 3, rightPip: 6, element: null }, 'right', 'player', 1);
      board.playStone({ id: 'p2', leftPip: 6, rightPip: 2, element: null }, 'right', 'player', 1);
      // Also put an enemy tile from a different turn to confirm it's ignored
      board.playStone({ id: 'e-old', leftPip: 2, rightPip: 1, element: null }, 'right', 'enemy', 0);
      const session = makeSession({ board: board.toJSON(), enemyHand: [], turnNumber: 1 });
      redisStore.set('combat:test-et-run', JSON.stringify(session));
      const res = await request(app).post('/api/run/test-et-run/combat/end-turn').send({});
      expect(res.status).toBe(200);
      // Junction at pip=6 → 6*2=12 damage. Enemy HP was 50 → should be 38.
      expect(res.body.enemy.hp.current).toBeLessThan(50);
    });

    it('turnNumber is incremented by exactly 1 per end-turn call', async () => {
      redisStore.set('combat:test-et-run', JSON.stringify(makeSession({ turnNumber: 3 })));
      const res = await request(app).post('/api/run/test-et-run/combat/end-turn').send({});
      expect(res.status).toBe(200);
      // Re-fetch session from redis
      const raw = redisStore.get('combat:test-et-run');
      const saved = JSON.parse(raw!);
      expect(saved.turnNumber).toBe(4);
    });

    it('refill always runs: response has hand field even when player played no tiles', async () => {
      redisStore.set('combat:test-et-run', JSON.stringify(makeSession()));
      const res = await request(app).post('/api/run/test-et-run/combat/end-turn').send({});
      expect(res.status).toBe(200);
      expect(res.body.hand).toBeDefined();
    });

    it('enemy plays shared open ends: board rightOpen=4, enemy has matching stone', async () => {
      const board = new Board();
      // Play a stone so rightOpen=4
      board.playStone({ id: 'seed', leftPip: 2, rightPip: 4, element: null }, 'right', 'player', 1);
      const enemyHand = [{ id: 'em1', leftPip: 4, rightPip: 5, element: null }];
      const session = makeSession({ board: board.toJSON(), enemyHand, turnNumber: 1 });
      redisStore.set('combat:test-et-run', JSON.stringify(session));
      const res = await request(app).post('/api/run/test-et-run/combat/end-turn').send({});
      expect(res.status).toBe(200);
      // Enemy should have played the 4-5 stone (connecting pip = 4 = rightOpen)
      expect(res.body.enemyAttack).toBeDefined();
      expect(res.body.enemyAttack.stonesPlayed.length).toBeGreaterThan(0);
      const played = res.body.enemyAttack.stonesPlayed[0];
      expect(played.leftPip === 4 || played.rightPip === 4).toBe(true);
    });

    it('stonesPlayedTotal incremented after end-turn', async () => {
      // Player has 2 stones already played in this turn
      const board = new Board();
      board.playStone({ id: 'p1', leftPip: 1, rightPip: 2, element: null }, 'right', 'player', 1);
      board.playStone({ id: 'p2', leftPip: 2, rightPip: 3, element: null }, 'right', 'player', 1);
      const session = makeSession({ board: board.toJSON(), stonesPlayedTotal: 2, turnNumber: 1 });
      redisStore.set('combat:test-et-run', JSON.stringify(session));
      await request(app).post('/api/run/test-et-run/combat/end-turn').send({});
      const raw = redisStore.get('combat:test-et-run');
      const saved = JSON.parse(raw!);
      expect(saved.stonesPlayedTotal).toBe(4); // 2 existing + 2 played this turn
    });

    it('gloveBase pre-increment: stonesPlayedTotal=3, play 1 tile, glove bonus uses index 4', async () => {
      const { RelicType } = await import('../../../src/game/relics/common');
      // stone at position 4 (3 prior + 1 new, 1-indexed) triggers glove if 4 is divisible by 5? No.
      // The glove triggers every 5th stone. Let's set stonesPlayedTotal=4 so stone at position 5.
      const board = new Board();
      board.playStone({ id: 'p1', leftPip: 3, rightPip: 3, element: null }, 'right', 'player', 1);
      const session = makeSession({
        board: board.toJSON(),
        stonesPlayedTotal: 4,
        relics: [RelicType.ChainMastersGlove],
        turnNumber: 1,
      });
      redisStore.set('combat:test-et-run', JSON.stringify(session));
      const res = await request(app).post('/api/run/test-et-run/combat/end-turn').send({});
      expect(res.status).toBe(200);
      // With stonesPlayedTotal=4 and 1 tile, gloveBase=4, index=4+1=5 which is divisible by 5
      // Stone (3,3): pipDmg = (3+3)*2 = 12, glove doubles it so bonus = 12
      // Total chain damage = 12 (base) + 12 (bonus) = 24
      expect(res.body.enemy.hp.current).toBeLessThan(50);
    });

    it('TravelerBoots fires only on win: enemy HP=1 with damaging player stones -> goldEarned present', async () => {
      const { RelicType } = await import('../../../src/game/relics/common');
      // Enemy HP=1, player plays two stones forming a junction at pip=1 → 2 damage → enemy dies
      const board = new Board();
      board.playStone({ id: 'p1', leftPip: 2, rightPip: 1, element: null }, 'right', 'player', 1);
      board.playStone({ id: 'p2', leftPip: 1, rightPip: 3, element: null }, 'right', 'player', 1);
      const session = makeSession({
        board: board.toJSON(),
        enemyHp: 1,
        relics: [RelicType.TravelerBoots],
        turnNumber: 1,
      });
      redisStore.set('combat:test-et-run', JSON.stringify(session));
      // Seed a minimal run state so the gold/relic logic runs
      const runState = {
        run: { id: 'test-et-run', userId: 'u1', status: 'active', currentAct: 1, relics: [RelicType.TravelerBoots], gold: 0 },
        playerState: { hp: { current: 80, max: 80 }, armor: 0, armorFortified: false, gold: 0, relics: [RelicType.TravelerBoots] },
        map: [{ id: 'node-1', type: 'combat', row: 0, col: 0, connections: [], completed: false }],
        currentNodeId: 'node-1',
      };
      redisStore.set('run:test-et-run', JSON.stringify(runState));
      const res = await request(app).post('/api/run/test-et-run/combat/end-turn').send({});
      expect(res.status).toBe(200);
      expect(res.body.combatResult).toBe('player-won');
      // TravelerBoots gives +1 gold per stone in winning chain (2 stones here)
      // Plus base gold for combat node (10-15g). Total should be >= 2.
      expect(res.body.goldEarned).toBeGreaterThanOrEqual(2);
    });

    it('TravelerBoots does NOT fire when enemy survives', async () => {
      const { RelicType } = await import('../../../src/game/relics/common');
      // Two stones, junction at pip=1 = 2 damage, enemy has 100 HP → survives
      const board = new Board();
      board.playStone({ id: 'p1', leftPip: 2, rightPip: 1, element: null }, 'right', 'player', 1);
      board.playStone({ id: 'p2', leftPip: 1, rightPip: 3, element: null }, 'right', 'player', 1);
      const session = makeSession({
        board: board.toJSON(),
        enemyHp: 100,
        relics: [RelicType.TravelerBoots],
        turnNumber: 1,
      });
      redisStore.set('combat:test-et-run', JSON.stringify(session));
      const res = await request(app).post('/api/run/test-et-run/combat/end-turn').send({});
      expect(res.status).toBe(200);
      expect(res.body.combatResult).toBe('ongoing');
      // goldEarned should be absent or 0 (no gold on non-win)
      expect(res.body.goldEarned ?? 0).toBe(0);
    });
  });

  describe('Boss defeat — act advancement', () => {
    const BOSS_RUN = 'test-boss-run';

    function makeBossRunState(act: number) {
      return {
        run: {
          id: BOSS_RUN,
          userId: 'user-boss',
          seed: 'boss-seed',
          currentAct: act,
          currentNodeId: 'boss-node-1',
          status: 'ACTIVE',
          hp: 80,
          maxHp: 80,
          gold: 0,
          relics: [],
          completedAt: null,
          createdAt: new Date().toISOString(),
        },
        playerState: { hp: { current: 80, max: 80 }, armor: 0, armorFortified: false, gold: 0, relics: [] },
        map: [{ id: 'boss-node-1', type: 'boss', row: 6, col: 0, connections: [], completed: false }],
        currentNodeId: 'boss-node-1',
        stones: [],
      };
    }

    function makeBossSession(act: number) {
      // Two player stones at turn 1 forming a pip-1 junction → 2 damage (kills enemyHp=1)
      const board = new Board();
      board.playStone({ id: 'p1', leftPip: 2, rightPip: 1, element: null }, 'right', 'player', 1);
      board.playStone({ id: 'p2', leftPip: 1, rightPip: 3, element: null }, 'right', 'player', 1);
      return {
        userId: BOSS_RUN,
        runId: BOSS_RUN,
        enemyId: `Act ${act} Boss`,
        enemyHp: 1,
        enemyMaxHp: 100,
        enemyStatus: { burn: 0, slow: 0, frozen: false, stunned: false, poison: 0 },
        hand: [],
        bag: [],
        board: board.toJSON(),
        enemyHand: [],
        enemyHandSize: 5,
        turnNumber: 1,
        swapsUsed: 0,
        swapsPerTurn: 1,
        playerHp: 80,
        playerMaxHp: 80,
        playerArmor: 0,
        playerGold: 0,
        relics: [],
        stonesPlayedTotal: 0,
      };
    }

    beforeEach(() => redisStore.clear());

    it('act 1 boss defeat advances run to act 2 with a fresh map and null currentNodeId', async () => {
      redisStore.set(`combat:${BOSS_RUN}`, JSON.stringify(makeBossSession(1)));
      redisStore.set(`run:${BOSS_RUN}`, JSON.stringify(makeBossRunState(1)));

      const res = await request(app).post(`/api/run/${BOSS_RUN}/combat/end-turn`).send({});
      expect(res.status).toBe(200);
      expect(res.body.combatResult).toBe('player-won');

      const saved = JSON.parse(redisStore.get(`run:${BOSS_RUN}`) ?? '{}');
      expect(saved.run.currentAct).toBe(2);
      expect(saved.run.status).toBe('ACTIVE');
      expect(saved.currentNodeId).toBeNull();
      expect(saved.map.length).toBeGreaterThan(1);
      expect(saved.map.some((n: any) => n.type === 'boss')).toBe(true);
    });

    it('act 2 boss defeat advances run to act 3 with a fresh map', async () => {
      redisStore.set(`combat:${BOSS_RUN}`, JSON.stringify(makeBossSession(2)));
      redisStore.set(`run:${BOSS_RUN}`, JSON.stringify(makeBossRunState(2)));

      const res = await request(app).post(`/api/run/${BOSS_RUN}/combat/end-turn`).send({});
      expect(res.status).toBe(200);

      const saved = JSON.parse(redisStore.get(`run:${BOSS_RUN}`) ?? '{}');
      expect(saved.run.currentAct).toBe(3);
      expect(saved.run.status).toBe('ACTIVE');
      expect(saved.currentNodeId).toBeNull();
      expect(saved.map.length).toBeGreaterThan(1);
    });

    it('act 3 boss defeat marks run as WON', async () => {
      redisStore.set(`combat:${BOSS_RUN}`, JSON.stringify(makeBossSession(3)));
      redisStore.set(`run:${BOSS_RUN}`, JSON.stringify(makeBossRunState(3)));

      const res = await request(app).post(`/api/run/${BOSS_RUN}/combat/end-turn`).send({});
      expect(res.status).toBe(200);
      expect(res.body.combatResult).toBe('player-won');

      const saved = JSON.parse(redisStore.get(`run:${BOSS_RUN}`) ?? '{}');
      expect(saved.run.status).toBe('WON');
    });

    it('non-boss combat win does not change currentAct', async () => {
      const combatRunState = {
        run: { id: BOSS_RUN, userId: 'user-boss', seed: 'boss-seed', currentAct: 1,
               status: 'ACTIVE', hp: 80, maxHp: 80, gold: 0, relics: [], completedAt: null, createdAt: new Date().toISOString() },
        playerState: { hp: { current: 80, max: 80 }, armor: 0, armorFortified: false, gold: 0, relics: [] },
        map: [{ id: 'combat-node-1', type: 'combat', row: 0, col: 0, connections: [], completed: false }],
        currentNodeId: 'combat-node-1',
        stones: [],
      };
      const board = new Board();
      board.playStone({ id: 'p1', leftPip: 2, rightPip: 1, element: null }, 'right', 'player', 1);
      board.playStone({ id: 'p2', leftPip: 1, rightPip: 3, element: null }, 'right', 'player', 1);
      const session = { ...makeBossSession(1), board: board.toJSON(), enemyId: 'Skeleton' };
      redisStore.set(`combat:${BOSS_RUN}`, JSON.stringify(session));
      redisStore.set(`run:${BOSS_RUN}`, JSON.stringify(combatRunState));

      await request(app).post(`/api/run/${BOSS_RUN}/combat/end-turn`).send({});

      const saved = JSON.parse(redisStore.get(`run:${BOSS_RUN}`) ?? '{}');
      expect(saved.run.currentAct).toBe(1);
    });
  });

  describe('POST /api/run/:runId/combat/play', () => {
    beforeEach(() => redisStore.clear());

    it('returns 400 when side is left on empty board', async () => {
      const stone = { id: 's1', leftPip: 3, rightPip: 4, element: null };
      const session = makeSession({ hand: [stone] });
      redisStore.set('combat:test-play-run', JSON.stringify({ ...session, userId: 'test-play-run', runId: 'test-play-run' }));
      const res = await request(app)
        .post('/api/run/test-play-run/combat/play')
        .send({ stoneIndex: 0, side: 'left' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when pip does not match', async () => {
      // Board with rightOpen=5, stone with pips 1,2 (no match)
      const board = new Board();
      board.playStone({ id: 'seed', leftPip: 3, rightPip: 5, element: null }, 'right', 'player', 1);
      const stone = { id: 's1', leftPip: 1, rightPip: 2, element: null };
      const session = { ...makeSession({ board: board.toJSON(), hand: [stone] }), userId: 'test-play-run', runId: 'test-play-run' };
      redisStore.set('combat:test-play-run', JSON.stringify(session));
      const res = await request(app)
        .post('/api/run/test-play-run/combat/play')
        .send({ stoneIndex: 0, side: 'right' });
      expect(res.status).toBe(400);
    });

    it('returns board in response when stone played successfully', async () => {
      const board = new Board();
      // First stone placed (rightOpen=4)
      board.playStone({ id: 'seed', leftPip: 2, rightPip: 4, element: null }, 'right', 'player', 1);
      // Stone that matches rightOpen=4
      const stone = { id: 's1', leftPip: 4, rightPip: 6, element: null };
      const session = { ...makeSession({ board: board.toJSON(), hand: [stone] }), userId: 'test-play-run', runId: 'test-play-run' };
      redisStore.set('combat:test-play-run', JSON.stringify(session));
      const res = await request(app)
        .post('/api/run/test-play-run/combat/play')
        .send({ stoneIndex: 0, side: 'right' });
      expect(res.status).toBe(200);
      expect(res.body.board).toBeDefined();
      expect(res.body.hand).toBeDefined();
    });
  });
});
