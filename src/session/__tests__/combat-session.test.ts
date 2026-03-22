jest.mock('ioredis', () => {
  const store = new Map<string, string>();
  return jest.fn().mockImplementation(() => ({
    set: jest.fn(async (key: string, value: string) => { store.set(key, value); return 'OK'; }),
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    del: jest.fn(async (key: string) => { store.delete(key); return 1; }),
    on: jest.fn(),
  }));
});

import {
  CombatSession,
  createCombatSession,
  getCombatSession,
  saveCombatSession,
  deleteCombatSession,
} from '../combat-session';

const makeSession = (overrides: Partial<CombatSession> = {}): CombatSession => ({
  userId: 'user-123',
  runId: 'run-456',
  enemyId: 'goblin',
  enemyHp: 30,
  enemyMaxHp: 30,
  enemyStatus: {
    burn: 0,
    slow: 0,
    frozen: false,
    stunned: false,
    poison: 0,
  },
  hand: [],
  bag: [],
  chain: {
    stones: [],
    leftOpen: null,
    rightOpen: null,
  },
  turnNumber: 1,
  swapsUsed: 0,
  swapsPerTurn: 1,
  ...overrides,
});

describe('createCombatSession', () => {
  it('saves a session to Redis', async () => {
    const session = makeSession();
    await createCombatSession(session);

    const retrieved = await getCombatSession(session.userId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.userId).toBe('user-123');
    expect(retrieved?.runId).toBe('run-456');
  });
});

describe('getCombatSession', () => {
  it('returns a parsed session for an existing key', async () => {
    const session = makeSession({ userId: 'user-get', enemyHp: 20 });
    await createCombatSession(session);

    const retrieved = await getCombatSession('user-get');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.enemyHp).toBe(20);
    expect(retrieved?.enemyStatus.frozen).toBe(false);
    expect(retrieved?.swapsPerTurn).toBe(1);
  });

  it('returns null for a missing key', async () => {
    const retrieved = await getCombatSession('nonexistent-user');
    expect(retrieved).toBeNull();
  });
});

describe('deleteCombatSession', () => {
  it('removes the session from Redis', async () => {
    const session = makeSession({ userId: 'user-delete' });
    await createCombatSession(session);

    // Confirm it exists first
    const before = await getCombatSession('user-delete');
    expect(before).not.toBeNull();

    await deleteCombatSession('user-delete');

    const after = await getCombatSession('user-delete');
    expect(after).toBeNull();
  });
});

describe('saveCombatSession', () => {
  it('updates an existing session with new values', async () => {
    const session = makeSession({ userId: 'user-save', enemyHp: 30, turnNumber: 1 });
    await createCombatSession(session);

    const updated: CombatSession = { ...session, enemyHp: 15, turnNumber: 2 };
    await saveCombatSession(updated);

    const retrieved = await getCombatSession('user-save');
    expect(retrieved?.enemyHp).toBe(15);
    expect(retrieved?.turnNumber).toBe(2);
  });

  it('saves a session that did not previously exist', async () => {
    const session = makeSession({ userId: 'user-save-new' });
    await saveCombatSession(session);

    const retrieved = await getCombatSession('user-save-new');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.userId).toBe('user-save-new');
  });
});
