import { startRun } from '../run';
import { awardGold, spendGold, awardGoldForEnemy } from '../gold';

describe('Gold economy', () => {
  test('awardGold increases player gold', () => {
    const run = startRun('u1', 's1');
    awardGold(run, 10);
    expect(run.gold).toBe(10);
  });

  test('awardGold stacks', () => {
    const run = startRun('u1', 's1');
    awardGold(run, 10);
    awardGold(run, 15);
    expect(run.gold).toBe(25);
  });

  test('spendGold deducts gold and returns true', () => {
    const run = startRun('u1', 's1');
    awardGold(run, 50);
    const result = spendGold(run, 30);
    expect(result).toBe(true);
    expect(run.gold).toBe(20);
  });

  test('spendGold returns false when insufficient funds', () => {
    const run = startRun('u1', 's1');
    awardGold(run, 20);
    const result = spendGold(run, 50);
    expect(result).toBe(false);
    expect(run.gold).toBe(20); // unchanged
  });

  test('gold cannot go below 0', () => {
    const run = startRun('u1', 's1');
    spendGold(run, 100);
    expect(run.gold).toBeGreaterThanOrEqual(0);
  });

  test('awardGold with seeded amount is in range', () => {
    const run = startRun('u1', 's1');
    // Normal enemy: 5-15 gold
    for (let i = 0; i < 10; i++) {
      const amount = awardGoldForEnemy('normal', `seed-${i}`);
      expect(amount).toBeGreaterThanOrEqual(5);
      expect(amount).toBeLessThanOrEqual(15);
    }
  });

  test('elite enemy rewards more gold than normal', () => {
    const normal = awardGoldForEnemy('normal', 'seed');
    const elite = awardGoldForEnemy('elite', 'seed');
    // Elite range 15-25, normal 5-15 — same seed, elite should be >= normal range min
    expect(elite).toBeGreaterThanOrEqual(15);
  });
});
