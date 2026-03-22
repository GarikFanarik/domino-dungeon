import { Bag } from '../bag';
import { Stone } from '../models/stone';
import { RelicDefinition, RelicType } from './common';

export const LEGENDARY_RELICS: RelicDefinition[] = [
  { id: RelicType.DominoCrown, name: 'Domino Crown', rarity: 'legendary', description: 'Doubles no longer end the chain.' },
  { id: RelicType.ElementalPrism, name: 'Elemental Prism', rarity: 'legendary', description: 'Neutral stones count as ALL elements.' },
  { id: RelicType.InfiniteBag, name: 'Infinite Bag', rarity: 'legendary', description: 'Stones played return to bag after combat.' },
  { id: RelicType.BloodPact, name: 'Blood Pact', rarity: 'legendary', description: 'Start combat: trade 10% max HP for +1 swap.' },
  { id: RelicType.TheLastStone, name: 'The Last Stone', rarity: 'legendary', description: 'When 1 stone left in hand, it deals 3× damage.' },
  { id: RelicType.CurseOfGreed, name: 'Curse of Greed', rarity: 'legendary', description: 'Gold rewards doubled, shop prices doubled.' },
];

export function applyInfiniteBag(playedStones: Stone[], bag: Bag): void {
  playedStones.forEach(s => bag.addStone(s));
}

export function applyBloodPact(hp: { current: number; max: number }, swaps: { perTurn: number }): void {
  const cost = Math.floor(hp.max * 0.1);
  hp.current = Math.max(1, hp.current - cost);
  swaps.perTurn += 1;
}

export function applyTheLastStone(handSize: number, damage: number): number {
  return handSize === 1 ? damage * 3 : damage;
}

export function applyCurseOfGreed(amount: number, _context: 'reward' | 'price'): number {
  return amount * 2;
}
