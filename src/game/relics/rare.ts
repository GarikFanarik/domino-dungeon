import { PlayerStats } from '../models/player-stats';
import { RelicDefinition, RelicType } from './common';

export const RARE_RELICS: RelicDefinition[] = [
  { id: RelicType.EmberCore,     name: 'Ember Core',      rarity: 'rare', description: 'Burn stacks never decay at end of turn.' },
  { id: RelicType.FrostbiteRing, name: 'Frostbite Ring',  rarity: 'rare', description: 'Each slow stack reduces enemy damage by 30% instead of 20%.' },
  { id: RelicType.StormAmulet,   name: 'Storm Amulet',    rarity: 'rare', description: 'Lightning bonus increased to +5 flat damage per stone.' },
  { id: RelicType.VenomGland,    name: 'Venom Gland',     rarity: 'rare', description: 'Poison stacks never decay between turns.' },
  { id: RelicType.IronSkin,      name: 'Iron Skin',       rarity: 'rare', description: 'Gain 1 extra armor whenever you gain armor.' },
];

export function applyEmberCore(stats: PlayerStats): void {
  stats.burnNoDecay = true;
}

export function applyFrostbiteRing(stats: PlayerStats): void {
  stats.frostbiteRing = true;
}

export function applyStormAmulet(stats: PlayerStats): void {
  stats.lightningFlatBonus += 2; // +2 on top of base 3 = 5 total per stone
}

export function applyVenomGland(stats: PlayerStats): void {
  stats.poisonNoDecay = true;
}

export function applyIronSkin(stats: PlayerStats): void {
  stats.armorGainBonus = 1;
}
