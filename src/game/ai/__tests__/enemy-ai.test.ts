import { Stone, ElementType } from '../../models/stone';
import { EnemyAI, EnemyAttack, EnemyType } from '../enemy-ai';

function stone(id: string, left: number, right: number, el: ElementType | null = null): Stone {
  return { id, leftPip: left, rightPip: right, element: el };
}

describe('Enemy AI', () => {
  test('builds chain from compatible stones', () => {
    const hand: Stone[] = [stone('a', 3, 4), stone('b', 4, 5), stone('c', 5, 2)];
    const ai = new EnemyAI();
    const chain = ai.buildChain(hand, EnemyType.Normal);
    expect(chain.stones.length).toBeGreaterThan(0);
  });

  test('greedy picks highest pip stone at each step', () => {
    // 3-3=6 pips vs 3-1=4 pips: greedy should prefer 3-3
    const hand: Stone[] = [stone('low', 3, 1), stone('high', 3, 3)];
    const ai = new EnemyAI();
    const chain = ai.buildChain(hand, EnemyType.Normal);
    // First stone placed should be the double 3-3 (6 total pips)
    expect(chain.stones[0].stone.id).toBe('high');
  });

  test('returns empty chain when hand is empty', () => {
    const ai = new EnemyAI();
    const chain = ai.buildChain([], EnemyType.Normal);
    expect(chain.stones.length).toBe(0);
  });

  test('returns partial chain when stones cannot extend', () => {
    // 1-2 can connect to 3-4 only if shared pip
    const hand: Stone[] = [stone('a', 1, 2), stone('b', 5, 6)];
    const ai = new EnemyAI();
    const chain = ai.buildChain(hand, EnemyType.Normal);
    // Only one stone will fit (they share no pips)
    expect(chain.stones.length).toBe(1);
  });

  test('buildChain returns EnemyAttack with damage', () => {
    const hand: Stone[] = [stone('a', 3, 3), stone('b', 3, 4), stone('c', 4, 5)];
    const ai = new EnemyAI();
    const attack = ai.buildAttack(hand, EnemyType.Normal);
    expect(attack.damage).toBeGreaterThan(0);
    expect(attack.chain.stones.length).toBeGreaterThan(0);
  });
});
