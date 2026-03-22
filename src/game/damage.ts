import { Chain } from './chain';
import { PlayerStats } from './models/player-stats';

export interface DamageBreakdown {
  baseDamage: number;
  chainBonus: number;
  elementBonus: number;
  finalDamage: number;
}

// For each stone after the first, the connecting pip is:
//   flipped=false → leftPip  (it's the pip that matched the open end)
//   flipped=true  → rightPip
function junctionValues(chain: Chain): number[] {
  return chain.stones.slice(1).map((placed) =>
    placed.flipped ? placed.stone.rightPip : placed.stone.leftPip
  );
}

// Damage = both pips count at every junction between adjacent stones.
// A junction at pip value N deals N (left stone) + N (right stone) = 2N damage.
// Single stone: 0 damage (no junctions).
// elementBonus is a flat value added on top.
export function calculateDamage(
  chain: Chain,
  _playerStats: PlayerStats,
  elementBonus: number = 0
): DamageBreakdown {
  const junctions = junctionValues(chain);

  // Each junction contributes pip × 2 (both touching pips have the same value)
  const baseDamage = junctions.reduce((sum, v) => sum + v * 2, 0);

  const finalDamage = Math.floor(baseDamage + elementBonus);

  return {
    baseDamage,
    chainBonus: 0,
    elementBonus,
    finalDamage,
  };
}

// Armor absorbs damage first. Returns remaining armor and damage that passes through.
export function applyArmor(
  damage: number,
  armor: number
): { damageToDeal: number; armorRemaining: number } {
  if (armor >= damage) {
    return { damageToDeal: 0, armorRemaining: armor - damage };
  }
  return { damageToDeal: damage - armor, armorRemaining: 0 };
}
