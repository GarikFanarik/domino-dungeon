import { Enemy } from '../models/enemy';

export interface BurnResult {
  damage: number;
}

export function applyBurn(enemy: Enemy, stacks: number): void {
  enemy.status.burn += stacks;
}

export function processBurnTick(enemy: Enemy, inferno: boolean = false): BurnResult {
  if (enemy.status.burn <= 0) return { damage: 0 };
  const baseDamage = enemy.status.burn * 2;
  const damage = inferno ? baseDamage * 2 : baseDamage;
  enemy.status.burn = Math.max(0, enemy.status.burn - 1);
  return { damage };
}
