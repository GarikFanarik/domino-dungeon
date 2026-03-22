import seedrandom from 'seedrandom';
import { Run } from './run';

const GOLD_RANGES = {
  normal: [5, 15],
  elite: [15, 25],
  boss: [30, 50],
} as const;

type EnemyType = keyof typeof GOLD_RANGES;

export function awardGold(run: Run, amount: number): void {
  run.gold += amount;
}

export function spendGold(run: Run, amount: number): boolean {
  if (run.gold < amount) return false;
  run.gold -= amount;
  return true;
}

export function awardGoldForEnemy(enemyType: EnemyType, seed: string): number {
  const rng = seedrandom(seed);
  const [min, max] = GOLD_RANGES[enemyType];
  return Math.floor(rng() * (max - min + 1)) + min;
}
