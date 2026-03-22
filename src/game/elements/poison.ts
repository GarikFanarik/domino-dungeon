import { Enemy } from '../models/enemy';

export function applyPoison(enemy: Enemy, stacks: number): void {
  enemy.status.poison += stacks;
}

export function processPoisonTick(enemy: Enemy, virulent: boolean = false): number {
  if (enemy.status.poison <= 0) return 0;
  const damage = enemy.status.poison;
  return virulent ? damage * 2 : damage;
}
