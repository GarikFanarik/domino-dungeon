export interface PlayerStats {
  swapsPerTurn: number;
  lightningFlatBonus: number;
  burnNoDecay: boolean;
  poisonNoDecay: boolean;
  armorGainBonus: number;
  frostbiteRing: boolean;
}

export function defaultPlayerStats(): PlayerStats {
  return {
    swapsPerTurn: 1,
    lightningFlatBonus: 0,
    burnNoDecay: false,
    poisonNoDecay: false,
    armorGainBonus: 0,
    frostbiteRing: false,
  };
}
