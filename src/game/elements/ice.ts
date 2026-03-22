import { Enemy } from '../models/enemy';

const MAX_SLOW_STACKS = 3;

export function applySlowEffect(enemy: Enemy, stacks: number): void {
  enemy.status.slow = Math.min(MAX_SLOW_STACKS, enemy.status.slow + stacks);
}

export function applyFreezeEffect(enemy: Enemy): void {
  enemy.status.frozen = true;
}

export function isEnemyFrozen(enemy: Enemy): boolean {
  return enemy.status.frozen;
}

export function processFreeze(enemy: Enemy): boolean {
  if (!enemy.status.frozen) return false;
  enemy.status.frozen = false;
  return true;
}

export function processSlowDecay(enemy: Enemy): void {
  enemy.status.slow = Math.max(0, enemy.status.slow - 1);
}

export function getSlowDamageMultiplier(enemy: Enemy): number {
  return 1 - (enemy.status.slow * 0.2);
}
