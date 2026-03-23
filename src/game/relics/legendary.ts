import { Stone } from '../models/stone';
import { RelicDefinition, RelicType } from './common';

export interface PlacedStoneMinimal {
  stone: Stone;
  side: 'left' | 'right';
  flipped: boolean;
}

export const LEGENDARY_RELICS: RelicDefinition[] = [
  { id: RelicType.DominoCrown,    name: 'Domino Crown',     rarity: 'legendary', description: 'Remove 5 random stones from your bag and gain a 2|2, 3|3, 4|4, 5|5, and 6|6.' },
  { id: RelicType.ElementalPrism, name: 'Elemental Prism',  rarity: 'legendary', description: 'Both sides of every Domino Tile get the element of the other side — each stone counts twice for element effects.' },
  { id: RelicType.InfiniteBag,    name: 'Infinite Bag',     rarity: 'legendary', description: 'Stones played return to your bag after each turn.' },
  { id: RelicType.BloodPact,      name: 'Blood Pact',       rarity: 'legendary', description: 'At the start of each combat lose 10 HP; at the end of combat gain 20 HP.' },
  { id: RelicType.TheLastStone,   name: 'The Last Stone',   rarity: 'legendary', description: 'Playing a chain with only 1 stone deals damage equal to (left + right pips) × 2.' },
  { id: RelicType.CurseOfGreed,   name: 'Curse of Greed',   rarity: 'legendary', description: 'Gold rewards doubled; lose 1 gold each time you take damage.' },
];

/**
 * Removes up to 5 random stones from the bag and adds the doubles 2|2 through 6|6.
 */
export function applyDominoCrown(stones: Stone[]): Stone[] {
  const shuffled = [...stones].sort(() => Math.random() - 0.5);
  const removeCount = Math.min(5, shuffled.length);
  const remaining = shuffled.slice(removeCount);
  const doubles: Stone[] = [2, 3, 4, 5, 6].map(pip => ({
    id: `domino-crown-${pip}${pip}`,
    leftPip: pip,
    rightPip: pip,
    element: null,
  }));
  return [...remaining, ...doubles];
}

/**
 * Returns new bag contents with played stones added back (called after each turn).
 */
export function applyInfiniteBag(playedStones: Stone[], bag: Stone[]): Stone[] {
  return [...bag, ...playedStones];
}

/** Deducts 10 HP at the start of combat (min 1). */
export function applyBloodPactStart(hp: { current: number; max: number }): void {
  hp.current = Math.max(1, hp.current - 10);
}

/** Restores 20 HP at the end of a won combat (capped at max). */
export function applyBloodPactEnd(hp: { current: number; max: number }): void {
  hp.current = Math.min(hp.max, hp.current + 20);
}

/**
 * Returns bonus damage when chain has exactly 1 stone: (leftPip + rightPip) × 2.
 * Returns 0 for any other chain length.
 */
export function applyTheLastStone(chain: PlacedStoneMinimal[]): number {
  if (chain.length !== 1) return 0;
  const { leftPip, rightPip } = chain[0].stone;
  return (leftPip + rightPip) * 2;
}

/**
 * 'reward' | 'price' → doubles the amount.
 * 'hit' → returns 1 (gold to deduct when player takes damage).
 */
export function applyCurseOfGreed(amount: number, context: 'reward' | 'price' | 'hit'): number {
  if (context === 'hit') return 1;
  return amount * 2;
}
