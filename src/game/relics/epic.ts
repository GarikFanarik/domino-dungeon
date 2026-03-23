import { Enemy } from '../models/enemy';
import { RelicDefinition, RelicType } from './common';

export const EPIC_RELICS: RelicDefinition[] = [
  { id: RelicType.PhoenixFeather,     name: 'Phoenix Feather',      rarity: 'epic', description: 'Once per run: survive a lethal hit with 30% of your max HP.' },
  { id: RelicType.ChainMastersGlove,  name: "Chain Master's Glove", rarity: 'epic', description: 'Every 5th stone played deals double pip damage.' },
  { id: RelicType.VoltaicLens,        name: 'Voltaic Lens',         rarity: 'epic', description: 'Overload also deals 15 bonus damage directly.' },
  { id: RelicType.GlacialHeart,       name: 'Glacial Heart',        rarity: 'epic', description: 'Freeze threshold reduced to 1 ice stone (instead of 2).' },
  { id: RelicType.PoisonTome,         name: 'Poison Tome',          rarity: 'epic', description: 'Start combat with 3 Poison stacks on enemy.' },
];

export interface PhoenixState { phoenixUsed: boolean; }

/**
 * Returns the HP to restore (30% of maxHp) if death is prevented, or 0 if not triggered.
 */
export function applyPhoenixFeather(currentHp: number, maxHp: number, state: PhoenixState): number {
  if (currentHp > 0 || state.phoenixUsed) return 0;
  state.phoenixUsed = true;
  return Math.max(1, Math.floor(maxHp * 0.3));
}

export function applyChainMastersGlove(stonePosition: number, pipDamage: number): number {
  return stonePosition % 5 === 0 ? pipDamage * 2 : pipDamage;
}

export function applyVoltaicLens(overloadTriggered: boolean, damage: number): number {
  return overloadTriggered ? damage + 15 : damage;
}

export function applyPoisonTome(enemy: Enemy): void {
  enemy.status.poison += 3;
}
