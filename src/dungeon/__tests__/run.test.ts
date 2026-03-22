import { startRun, completeRun, failRun, getRunStatus, RunStatus, Run } from '../run';

describe('Dungeon run state', () => {
  test('startRun creates a new run with status ACTIVE', () => {
    const run = startRun('user-123', 'seed-abc');
    expect(run.userId).toBe('user-123');
    expect(run.status).toBe(RunStatus.Active);
    expect(run.currentAct).toBe(1);
    expect(run.hp).toBe(80);
    expect(run.maxHp).toBe(80);
    expect(run.gold).toBe(0);
  });

  test('startRun generates a unique id', () => {
    const r1 = startRun('u1', 's1');
    const r2 = startRun('u1', 's2');
    expect(r1.id).not.toBe(r2.id);
  });

  test('startRun stores the seed', () => {
    const run = startRun('u1', 'my-seed');
    expect(run.seed).toBe('my-seed');
  });

  test('completeRun sets status to WON', () => {
    const run = startRun('u1', 's1');
    completeRun(run);
    expect(run.status).toBe(RunStatus.Won);
    expect(run.completedAt).toBeDefined();
  });

  test('failRun sets status to LOST', () => {
    const run = startRun('u1', 's1');
    failRun(run);
    expect(run.status).toBe(RunStatus.Lost);
  });

  test('getRunStatus returns current status', () => {
    const run = startRun('u1', 's1');
    expect(getRunStatus(run)).toBe(RunStatus.Active);
    completeRun(run);
    expect(getRunStatus(run)).toBe(RunStatus.Won);
  });

  test('run has relics array initially empty', () => {
    const run = startRun('u1', 's1');
    expect(run.relics).toEqual([]);
  });
});
