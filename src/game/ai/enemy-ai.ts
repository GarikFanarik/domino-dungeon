import { Stone } from '../models/stone';
import { Chain } from '../chain';

export enum EnemyType {
  Normal = 'Normal',
  Elite = 'Elite',
  Boss = 'Boss',
}

export interface EnemyAttack {
  chain: Chain;
  damage: number;
  effects: Record<string, unknown>;
}

export class EnemyAI {
  buildChain(hand: Stone[], _enemyType: EnemyType): Chain {
    const chain = new Chain();
    if (hand.length === 0) return chain;

    const remaining = [...hand];

    // Place first stone: pick highest total pips
    remaining.sort((a, b) => (b.leftPip + b.rightPip) - (a.leftPip + a.rightPip));
    const first = remaining.shift()!;
    chain.playStone(first, 'right', false);

    // Greedy: at each step pick highest-pip stone that fits either end
    let changed = true;
    while (changed && remaining.length > 0) {
      changed = false;
      let bestIdx = -1;
      let bestPips = -1;
      let bestSide: 'left' | 'right' = 'right';
      let bestFlipped = false;

      for (let i = 0; i < remaining.length; i++) {
        const s = remaining[i];
        const { left, right } = chain.canPlay(s);
        if (!left && !right) continue;

        const pips = s.leftPip + s.rightPip;
        if (pips > bestPips) {
          bestPips = pips;
          bestIdx = i;
          bestSide = right ? 'right' : 'left';
          // Determine if we need to flip
          if (bestSide === 'right' && s.leftPip !== chain.rightOpen) bestFlipped = true;
          else if (bestSide === 'left' && s.rightPip !== chain.leftOpen) bestFlipped = true;
          else bestFlipped = false;
        }
      }

      if (bestIdx >= 0) {
        const s = remaining.splice(bestIdx, 1)[0];
        chain.playStone(s, bestSide, bestFlipped);
        changed = true;
      }
    }

    return chain;
  }

  buildAttack(hand: Stone[], enemyType: EnemyType): EnemyAttack {
    const chain = this.buildChain(hand, enemyType);
    const damage = chain.stones.reduce(
      (sum, p) => sum + p.stone.leftPip + p.stone.rightPip,
      0
    );
    return { chain, damage, effects: {} };
  }
}
