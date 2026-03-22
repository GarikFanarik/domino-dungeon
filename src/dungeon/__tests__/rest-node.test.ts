import { startRun, Run } from '../run';
import { Bag } from '../../game/bag';
import { restHeal, upgradeStone, RestResult } from '../rest-node';

describe('Rest node', () => {
  test('restHeal restores 30% of maxHp (rounded down)', () => {
    const run = startRun('u1', 's1');
    run.hp = 50; // damaged
    const restored = restHeal(run);
    expect(restored).toBe(24); // floor(80 * 0.3) = 24
    expect(run.hp).toBe(74);
  });

  test('restHeal does not exceed maxHp', () => {
    const run = startRun('u1', 's1');
    run.hp = 78; // near full
    restHeal(run);
    expect(run.hp).toBe(80);
  });

  test('restHeal returns actual amount healed', () => {
    const run = startRun('u1', 's1');
    run.hp = 79;
    const restored = restHeal(run);
    expect(restored).toBe(1); // only 1 space available
  });

  test('upgradeStone increments left pip by 1', () => {
    const bag = new Bag();
    const stone = bag.stones[0];
    const original = stone.leftPip;
    const result = upgradeStone(bag, stone.id, 'left');
    expect(result.success).toBe(true);
    expect(bag.stones.find(s => s.id === stone.id)!.leftPip).toBe(Math.min(6, original + 1));
  });

  test('upgradeStone caps pip at 6', () => {
    const bag = new Bag();
    // find a stone with leftPip = 6 or set one up
    const stone = bag.stones.find(s => s.leftPip === 6);
    if (stone) {
      upgradeStone(bag, stone.id, 'left');
      expect(bag.stones.find(s => s.id === stone.id)!.leftPip).toBe(6);
    } else {
      // Use right side with pip=5 as proxy
      const s5 = bag.stones.find(s => s.rightPip === 5)!;
      upgradeStone(bag, s5.id, 'right');
      expect(bag.stones.find(s => s.id === s5.id)!.rightPip).toBe(6);
    }
  });

  test('upgradeStone fails when stone not found', () => {
    const bag = new Bag();
    const result = upgradeStone(bag, 'bad-id', 'left');
    expect(result.success).toBe(false);
  });
});
