import { PlayerStats } from '../models/player-stats';
import { RelicDefinition, RelicType } from './common';

export const RARE_RELICS: RelicDefinition[] = [
  { id: RelicType.EmberCore, name: 'Ember Core', rarity: 'rare', description: 'Fire stones deal +1 Burn stack per stone.' },
  { id: RelicType.FrostbiteRing, name: 'Frostbite Ring', rarity: 'rare', description: 'Ice chains of 2+ also slow enemy by 1 additional stack.' },
  { id: RelicType.StormAmulet, name: 'Storm Amulet', rarity: 'rare', description: 'Lightning bonus increased to +5 flat damage per stone.' },
  { id: RelicType.VenomGland, name: 'Venom Gland', rarity: 'rare', description: 'Poison ticks deal +1 additional damage per stack.' },
  { id: RelicType.IronSkin, name: 'Iron Skin', rarity: 'rare', description: 'Armor cap raised from 20 to 35.' },
];

export function applyEmberCore(stats: PlayerStats): void {
  stats.burnStackBonus += 1;
}

export function applyFrostbiteRing(stats: PlayerStats): void {
  stats.slowStackBonus += 1;
}

export function applyStormAmulet(stats: PlayerStats): void {
  stats.lightningFlatBonus += 2; // +2 on top of base 3 = 5 total per stone
}

export function applyVenomGland(stats: PlayerStats): void {
  stats.poisonDamageBonus += 1;
}

export function applyIronSkin(stats: PlayerStats): void {
  stats.armorCap = 35;
}
