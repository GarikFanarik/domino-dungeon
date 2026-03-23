import { Enemy } from '../models/enemy';

const LIGHTNING_FLAT_BONUS = 3;
export const OVERLOAD_THRESHOLD = 4;

export function calculateLightningBonus(lightningCount: number, flatBonusPerStone: number = LIGHTNING_FLAT_BONUS): number {
  return lightningCount * flatBonusPerStone;
}

export function applyStun(enemy: Enemy): void {
  enemy.status.stunned = true;
}

export function processStun(enemy: Enemy): boolean {
  if (!enemy.status.stunned) return false;
  enemy.status.stunned = false;
  return true;
}
