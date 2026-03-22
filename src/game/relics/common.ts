import { PlayerState } from '../models/player-state';
import { Bag } from '../bag';
import { Stone, ElementType } from '../models/stone';

export enum RelicType {
  // Common
  WornPouch = 'worn-pouch',
  LuckyPip = 'lucky-pip',
  CrackedShield = 'cracked-shield',
  TravelerBoots = 'travelers-boots',
  PebbleCharm = 'pebble-charm',
  // Rare (placeholders for later)
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
  { id: RelicType.WornPouch, name: 'Worn Pouch', rarity: 'common', description: 'Bag starts with 2 extra random stones.' },
  { id: RelicType.LuckyPip, name: 'Lucky Pip', rarity: 'common', description: 'Once per combat: re-roll one stone in hand.' },
  { id: RelicType.CrackedShield, name: 'Cracked Shield', rarity: 'common', description: 'Start each combat with 5 Armor.' },
  { id: RelicType.TravelerBoots, name: "Traveler's Boots", rarity: 'common', description: 'Gain 5 bonus gold after every elite/boss fight.' },
  { id: RelicType.PebbleCharm, name: 'Pebble Charm', rarity: 'common', description: 'Earth element grants +1 extra Armor per stone.' },
];

export function applyWornPouch(bag: Bag): void {
  const extras = new Bag().draw(2);
  extras.forEach(s => bag.addStone(s));
}

export interface LuckyPipResult {
  success: boolean;
  newStone?: Stone;
}

export function applyLuckyPip(hand: Stone[], bag: Bag): LuckyPipResult {
  if (hand.length === 0 || bag.size === 0) return { success: false };
  // Remove first stone from hand, put back, draw new one
  const removed = hand.splice(0, 1)[0];
  bag.addStone(removed);
  bag.shuffle();
  const [newStone] = bag.draw(1);
  hand.unshift(newStone);
  return { success: true, newStone };
}

export function applyCrackedShield(player: PlayerState, armorCap: number): void {
  player.armor = Math.min(armorCap, player.armor + 5);
}

export function applyTravelerBoots(currentGold: number): number {
  return currentGold + 5;
}

export function applyPebbleCharm(earthStoneCount: number): number {
  return earthStoneCount; // +1 bonus armor per earth stone
}
