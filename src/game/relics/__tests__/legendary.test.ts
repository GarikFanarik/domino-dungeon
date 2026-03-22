import { Bag } from '../../bag';
import { Chain } from '../../chain';
import { Stone, ElementType } from '../../models/stone';
import {
  LEGENDARY_RELICS,
  applyInfiniteBag,
  applyBloodPact,
  applyTheLastStone,
  applyCurseOfGreed,
} from '../legendary';

function makeStone(id: string, left = 3, right = 3, el: ElementType | null = null): Stone {
  return { id, leftPip: left, rightPip: right, element: el };
}

describe('Legendary relics', () => {
  test('all 6 legendary relics are defined', () => {
    expect(LEGENDARY_RELICS.length).toBe(6);
  });

  test('InfiniteBag restores played stones to bag after combat', () => {
    const played = [makeStone('s1'), makeStone('s2')];
    const bag = new Bag([]);
    applyInfiniteBag(played, bag);
    expect(bag.size).toBe(2);
  });

  test('BloodPact deducts 10% maxHp and grants +1 swap', () => {
    const hp = { current: 80, max: 80 };
    const swaps = { perTurn: 1 };
    applyBloodPact(hp, swaps);
    expect(hp.current).toBe(72); // 80 - 8 (10% of 80)
    expect(swaps.perTurn).toBe(2);
  });

  test('TheLastStone triples damage when only 1 stone in hand', () => {
    expect(applyTheLastStone(1, 10)).toBe(30);
    expect(applyTheLastStone(2, 10)).toBe(10);
    expect(applyTheLastStone(0, 10)).toBe(10); // 0 stones = no effect
  });

  test('CurseOfGreed doubles gold reward', () => {
    expect(applyCurseOfGreed(20, 'reward')).toBe(40);
  });

  test('CurseOfGreed doubles shop prices', () => {
    expect(applyCurseOfGreed(50, 'price')).toBe(100);
  });
});
