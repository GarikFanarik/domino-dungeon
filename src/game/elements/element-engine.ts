import { ElementType, Stone } from '../models/stone';
import { Enemy } from '../models/enemy';
import { PlayerState } from '../models/player-state';
import { Chain } from '../chain';
import { applyBurn } from './fire';
import { applySlowEffect, applyFreezeEffect } from './ice';
import { calculateLightningBonus, applyStun, OVERLOAD_THRESHOLD } from './lightning';
import { applyPoison } from './poison';
import { grantArmor } from './earth';
import { RelicType } from '../relics/common';

export interface ChainAnalysis {
  counts: Partial<Record<ElementType, number>>;
  infernoTriggered: boolean;   // 3+ Fire
  freezeTriggered: boolean;    // 2+ Ice (1+ with GlacialHeart)
  overloadTriggered: boolean;  // 4+ Lightning
}

export interface CombatEffects {
  burnApplied: number;
  slowApplied: number;
  lightningBonus: number;
  poisonApplied: number;
  armorGained: number;
  specialTriggered: boolean;
}

const ARMOR_PER_EARTH = 3;
const ARMOR_CAP = 20;

export function analyzeChain(chain: Chain, relics: string[] = []): ChainAnalysis {
  const counts: Partial<Record<ElementType, number>> = {};
  const hasElementalPrism = relics.includes(RelicType.ElementalPrism);

  for (const placed of chain.stones) {
    const el = placed.stone.element;
    if (el !== null && el !== undefined) {
      // ElementalPrism: each stone counts twice for element effects
      const increment = hasElementalPrism ? 2 : 1;
      counts[el] = (counts[el] ?? 0) + increment;
    }
  }

  const iceCount = counts[ElementType.Ice] ?? 0;
  const freezeThreshold = relics.includes(RelicType.GlacialHeart) ? 1 : 2;

  return {
    counts,
    infernoTriggered: (counts[ElementType.Fire] ?? 0) >= 3,
    freezeTriggered: iceCount >= freezeThreshold,
    overloadTriggered: (counts[ElementType.Lightning] ?? 0) >= OVERLOAD_THRESHOLD,
  };
}

export function applyChainEffects(
  analysis: ChainAnalysis,
  player: PlayerState,
  enemy: Enemy,
  relics: string[] = []
): CombatEffects {
  const effects: CombatEffects = {
    burnApplied: 0,
    slowApplied: 0,
    lightningBonus: 0,
    poisonApplied: 0,
    armorGained: 0,
    specialTriggered: false,
  };

  const armorGainBonus = relics.includes(RelicType.IronSkin) ? 1 : 0;

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
    const flatBonusPerStone = 3 + (relics.includes(RelicType.StormAmulet) ? 2 : 0);
    effects.lightningBonus = calculateLightningBonus(lightningCount, flatBonusPerStone);
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

  // Earth — PebbleCharm: fortify at 2+ instead of 3+
  const earthCount = analysis.counts[ElementType.Earth] ?? 0;
  if (earthCount > 0) {
    const armorAmount = earthCount * ARMOR_PER_EARTH + armorGainBonus;
    const fortifyThreshold = relics.includes(RelicType.PebbleCharm) ? 2 : 3;
    const fortify = earthCount >= fortifyThreshold;
    grantArmor(player, armorAmount, ARMOR_CAP, fortify);
    effects.armorGained = armorAmount;
  }

  return effects;
}
