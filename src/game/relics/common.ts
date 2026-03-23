import { PlayerState } from '../models/player-state';

export enum RelicType {
  // Common
  WornPouch = 'worn-pouch',
  LuckyPip = 'lucky-pip',
  CrackedShield = 'cracked-shield',
  TravelerBoots = 'travelers-boots',
  PebbleCharm = 'pebble-charm',
  // Rare
  EmberCore = 'ember-core',
  FrostbiteRing = 'frostbite-ring',
  StormAmulet = 'storm-amulet',
  VenomGland = 'venom-gland',
  IronSkin = 'iron-skin',
  // Epic
  PhoenixFeather = 'phoenix-feather',
  ChainMastersGlove = 'chain-masters-glove',
  VoltaicLens = 'voltaic-lens',
  GlacialHeart = 'glacial-heart',
  PoisonTome = 'poison-tome',
  // Legendary
  DominoCrown = 'domino-crown',
  ElementalPrism = 'elemental-prism',
  InfiniteBag = 'infinite-bag',
  BloodPact = 'blood-pact',
  TheLastStone = 'the-last-stone',
  CurseOfGreed = 'curse-of-greed',
}

export interface RelicDefinition {
  id: RelicType;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
}

export const COMMON_RELICS: RelicDefinition[] = [
  { id: RelicType.WornPouch,      name: 'Worn Pouch',        rarity: 'common', description: 'Start each combat with 8 stones in hand instead of 7.' },
  { id: RelicType.LuckyPip,       name: 'Lucky Pip',         rarity: 'common', description: 'Permanently gain +1 swap per turn.' },
  { id: RelicType.CrackedShield,  name: 'Cracked Shield',    rarity: 'common', description: 'Start each combat with 5 Armor.' },
  { id: RelicType.TravelerBoots,  name: "Traveler's Boots",  rarity: 'common', description: 'Gain 1 gold per stone in your chain when you win a combat.' },
  { id: RelicType.PebbleCharm,    name: 'Pebble Charm',      rarity: 'common', description: 'Earth chains of 2+ stones fortify (armor persists between turns).' },
];

/** Returns the hand size to draw at combat start (base + 1). */
export function applyWornPouch(baseHandSize: number): number {
  return baseHandSize + 1;
}

/** Returns the new swaps-per-turn value (+1). */
export function applyLuckyPip(swapsPerTurn: number): number {
  return swapsPerTurn + 1;
}

export function applyCrackedShield(player: PlayerState, armorCap: number): void {
  player.armor = Math.min(armorCap, player.armor + 5);
}

/** Returns gold earned (1 per stone in winning chain). */
export function applyTravelerBoots(chainLength: number): number {
  return chainLength;
}

/** Returns true if earth count meets the PebbleCharm fortify threshold (2+). */
export function applyPebbleCharm(earthCount: number): boolean {
  return earthCount >= 2;
}
