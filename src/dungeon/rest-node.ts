import { Run } from './run';
import { Bag } from '../game/bag';

export interface RestResult {
  success: boolean;
  reason?: string;
}

export function restHeal(run: Run): number {
  const healAmount = Math.floor(run.maxHp * 0.3);
  const space = run.maxHp - run.hp;
  const actual = Math.min(healAmount, space);
  run.hp += actual;
  return actual;
}

export function upgradeStone(bag: Bag, stoneId: string, side: 'left' | 'right'): RestResult {
  const stone = bag.stones.find(s => s.id === stoneId);
  if (!stone) return { success: false, reason: 'Stone not found' };
  if (side === 'left') {
    stone.leftPip = Math.min(6, stone.leftPip + 1);
  } else {
    stone.rightPip = Math.min(6, stone.rightPip + 1);
  }
  return { success: true };
}
