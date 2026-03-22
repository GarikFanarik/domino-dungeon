export interface PlayerStats {
  swapsPerTurn: number;
  armorCap: number;
  // Relic bonuses
  burnStackBonus: number;
  slowStackBonus: number;
  lightningFlatBonus: number;
  poisonDamageBonus: number;
}

export function defaultPlayerStats(): PlayerStats {
  return {
    swapsPerTurn: 1,
    armorCap: 20,
    burnStackBonus: 0,
    slowStackBonus: 0,
    lightningFlatBonus: 0,
    poisonDamageBonus: 0,
  };
}
