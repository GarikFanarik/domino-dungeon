import { Enemy } from '../models/enemy';
import { RelicDefinition, RelicType } from './common';

export const EPIC_RELICS: RelicDefinition[] = [
  { id: RelicType.PhoenixFeather, name: 'Phoenix Feather', rarity: 'epic', description: 'Once per run: survive a lethal hit with 1 HP.' },
  { id: RelicType.ChainMastersGlove, name: "Chain Master's Glove", rarity: 'epic', description: 'Every 5th stone played deals double pip damage.' },
  { id: RelicType.VoltaicLens, name: 'Voltaic Lens', rarity: 'epic', description: 'Overload also deals 15 bonus damage directly.' },
  { id: RelicType.GlacialHeart, name: 'Glacial Heart', rarity: 'epic', description: 'Frozen enemies receive 50% more damage.' },
  { id: RelicType.PoisonTome, name: 'Poison Tome', rarity: 'epic', description: 'Start combat with 3 Poison stacks on enemy.' },
];

export interface PhoenixState { phoenixUsed: boolean; }

export function applyPhoenixFeather(currentHp: number, state: PhoenixState): boolean {
  if (currentHp > 0 || state.phoenixUsed) return false;
  state.phoenixUsed = true;
  return true;
}

export function applyChainMastersGlove(stonePosition: number, pipDamage: number): number {
  return stonePosition % 5 === 0 ? pipDamage * 2 : pipDamage;
}

export function applyVoltaicLens(overloadTriggered: boolean, damage: number): number {
  return overloadTriggered ? damage + 15 : damage;
}

export function applyGlacialHeart(enemy: Enemy, damage: number): number {
  return enemy.status.frozen ? Math.floor(damage * 1.5) : damage;
}

export function applyPoisonTome(enemy: Enemy): void {
  enemy.status.poison += 3;
}
