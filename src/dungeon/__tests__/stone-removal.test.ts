import { startRun } from '../run';
import { awardGold } from '../gold';
import { Bag } from '../../game/bag';
import { removeStoneFromBag, RemoveResult } from '../stone-removal';

describe('Stone removal service', () => {
  test('removeStoneFromBag removes stone and deducts 75 gold', () => {
    const run = startRun('u1', 's1');
    awardGold(run, 100);
    const bag = new Bag();
    const stone = bag.stones[0];
    const result = removeStoneFromBag(run, bag, stone.id);
    expect(result.success).toBe(true);
    expect(run.gold).toBe(25);
    expect(bag.stones.find(s => s.id === stone.id)).toBeUndefined();
  });

  test('removeStoneFromBag fails with insufficient gold', () => {
    const run = startRun('u1', 's1');
    // gold = 0
    const bag = new Bag();
    const stone = bag.stones[0];
    const result = removeStoneFromBag(run, bag, stone.id);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('gold');
  });

  test('removeStoneFromBag enforces minimum 10 stones', () => {
    const run = startRun('u1', 's1');
    awardGold(run, 1000);
    // Create bag with exactly 10 stones (draw 10 from a full set)
    const bag = new Bag([]);
    const fullBag = new Bag();
    fullBag.draw(10).forEach(s => bag.addStone(s)); // exactly 10 stones in bag
    expect(bag.size).toBe(10);
    const result = removeStoneFromBag(run, bag, bag.stones[0].id);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('minimum');
  });

  test('removeStoneFromBag fails when stone not found', () => {
    const run = startRun('u1', 's1');
    awardGold(run, 100);
    const bag = new Bag();
    const result = removeStoneFromBag(run, bag, 'nonexistent-id');
    expect(result.success).toBe(false);
  });
});
