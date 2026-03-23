import { Bag } from '../../bag';
import { Stone } from '../../models/stone';
import {
  LEGENDARY_RELICS,
  applyDominoCrown,
  applyInfiniteBag,
  applyBloodPactStart,
  applyBloodPactEnd,
  applyTheLastStone,
  applyCurseOfGreed,
} from '../legendary';

function makeStone(id: string, left = 1, right = 2): Stone {
  return { id, leftPip: left, rightPip: right, element: null };
}

describe('Legendary relics', () => {
  test('all 6 legendary relics are defined', () => {
    expect(LEGENDARY_RELICS.length).toBe(6);
  });

  test('DominoCrown removes 5 random stones and adds 2|2 through 6|6 doubles', () => {
    const stones = Array.from({ length: 10 }, (_, i) => makeStone(`s${i}`));
    const result = applyDominoCrown(stones);
    expect(result.length).toBe(10); // 10 - 5 + 5 = 10
    const doubles = result.filter(s => s.leftPip === s.rightPip && s.leftPip >= 2 && s.leftPip <= 6);
    expect(doubles.length).toBe(5);
    const pips = doubles.map(s => s.leftPip).sort();
    expect(pips).toEqual([2, 3, 4, 5, 6]);
  });

  test('DominoCrown works when bag has fewer than 5 stones', () => {
    const stones = [makeStone('s1'), makeStone('s2')];
    const result = applyDominoCrown(stones);
    // Removes min(5, 2) = 2 stones, adds 5 doubles → 5 total
    const doubles = result.filter(s => s.leftPip === s.rightPip && s.leftPip >= 2);
    expect(doubles.length).toBe(5);
  });

  test('InfiniteBag returns played stones to bag after turn', () => {
    const played = [makeStone('s1'), makeStone('s2')];
    const bag = [makeStone('s3')];
    const newBag = applyInfiniteBag(played, bag);
    expect(newBag.length).toBe(3);
    expect(newBag).toContainEqual(played[0]);
    expect(newBag).toContainEqual(played[1]);
  });

  test('BloodPactStart deducts 10 HP at combat start', () => {
    const hp = { current: 80, max: 80 };
    applyBloodPactStart(hp);
    expect(hp.current).toBe(70);
  });

  test('BloodPactStart does not kill the player (min 1 HP)', () => {
    const hp = { current: 5, max: 80 };
    applyBloodPactStart(hp);
    expect(hp.current).toBe(1);
  });

  test('BloodPactEnd restores 20 HP at end of combat', () => {
    const hp = { current: 50, max: 80 };
    applyBloodPactEnd(hp);
    expect(hp.current).toBe(70);
  });

  test('BloodPactEnd does not exceed max HP', () => {
    const hp = { current: 75, max: 80 };
    applyBloodPactEnd(hp);
    expect(hp.current).toBe(80);
  });

  test('TheLastStone deals (left + right) * 2 damage when chain has 1 stone', () => {
    const chain = [{ stone: makeStone('s1', 3, 4), side: 'right' as const, flipped: false }];
    expect(applyTheLastStone(chain)).toBe(14); // (3 + 4) * 2
  });

  test('TheLastStone returns 0 for chains with more than 1 stone', () => {
    const chain = [
      { stone: makeStone('s1', 3, 4), side: 'right' as const, flipped: false },
      { stone: makeStone('s2', 4, 5), side: 'right' as const, flipped: false },
    ];
    expect(applyTheLastStone(chain)).toBe(0);
  });

  test('TheLastStone returns 0 for empty chain', () => {
    expect(applyTheLastStone([])).toBe(0);
  });

  test('CurseOfGreed doubles gold rewards', () => {
    expect(applyCurseOfGreed(20, 'reward')).toBe(40);
  });

  test('CurseOfGreed doubles shop prices', () => {
    expect(applyCurseOfGreed(50, 'price')).toBe(100);
  });

  test('CurseOfGreed deducts 1 gold when hit', () => {
    expect(applyCurseOfGreed(0, 'hit')).toBe(1);
  });
});
