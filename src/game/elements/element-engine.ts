import { ElementType, Stone } from '../models/stone';
import { Enemy } from '../models/enemy';
import { PlayerState } from '../models/player-state';
import { Chain } from '../chain';
import { applyBurn } from './fire';
import { applySlowEffect, applyFreezeEffect } from './ice';
import { calculateLightningBonus, applyStun, OVERLOAD_THRESHOLD } from './lightning';
import { applyPoison } from './poison';
import { grantArmor } from './earth';

export interface ChainAnalysis {
  counts: Partial<Record<ElementType, number>>;
  infernoTriggered: boolean;   // 3+ Fire
  freezeTriggered: boolean;    // 2+ Ice
  overloadTriggered: boolean;  // 4+ Lightning
}

export interface CombatEffects {
  burnApplied: number;
  slowApplied: number;
  lightningBonus: number;
  poisonApplied: number;
  armorGained: number;
  specialTriggered: boolean; // freeze or stun triggered
}

const ARMOR_PER_EARTH = 3;
const ARMOR_CAP = 20;

export function analyzeChain(chain: Chain): ChainAnalysis {
  const counts: Partial<Record<ElementType, number>> = {};

  for (const placed of chain.stones) {
    const el = placed.stone.element;
    if (el !== null && el !== undefined) {
      counts[el] = (counts[el] ?? 0) + 1;
    }
  }

  return {
    counts,
    infernoTriggered: (counts[ElementType.Fire] ?? 0) >= 3,
    freezeTriggered: (counts[ElementType.Ice] ?? 0) >= 2,
    overloadTriggered: (counts[ElementType.Lightning] ?? 0) >= OVERLOAD_THRESHOLD,
  };
}

export function applyChainEffects(
  analysis: ChainAnalysis,
  player: PlayerState,
  enemy: Enemy
): CombatEffects {
  const effects: CombatEffects = {
    burnApplied: 0,
    slowApplied: 0,
    lightningBonus: 0,
    poisonApplied: 0,
    armorGained: 0,
    specialTriggered: false,
  };

  // Fire
  const fireCount = analysis.counts[ElementType.Fire] ?? 0;
  if (fireCount > 0) {
    applyBurn(enemy, fireCount);
    effects.burnApplied = fireCount;
  }

  // Ice
  const iceCount = analysis.counts[ElementType.Ice] ?? 0;
  if (iceCount > 0) {
    applySlowEffect(enemy, iceCount);
    effects.slowApplied = iceCount;
  }
  if (analysis.freezeTriggered) {
    applyFreezeEffect(enemy);
    effects.specialTriggered = true;
  }

  // Lightning
  const lightningCount = analysis.counts[ElementType.Lightning] ?? 0;
  if (lightningCount > 0) {
    effects.lightningBonus = calculateLightningBonus(lightningCount);
  }
  if (analysis.overloadTriggered) {
    applyStun(enemy);
    effects.specialTriggered = true;
  }

  // Poison
  const poisonCount = analysis.counts[ElementType.Poison] ?? 0;
  if (poisonCount > 0) {
    applyPoison(enemy, poisonCount);
    effects.poisonApplied = poisonCount;
  }

  // Earth
  const earthCount = analysis.counts[ElementType.Earth] ?? 0;
  if (earthCount > 0) {
    const armorAmount = earthCount * ARMOR_PER_EARTH;
    const fortify = earthCount >= 3;
    grantArmor(player, armorAmount, ARMOR_CAP, fortify);
    effects.armorGained = armorAmount;
  }

  return effects;
}
