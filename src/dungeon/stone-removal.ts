import { Run } from './run';
import { spendGold } from './gold';
import { Bag } from '../game/bag';
import { Stone } from '../game/models/stone';

const REMOVAL_COST = 75;
const MIN_BAG_SIZE = 10;

export interface RemoveResult {
  success: boolean;
  reason?: string;
  removedStone?: Stone;
}

export function removeStoneFromBag(run: Run, bag: Bag, stoneId: string): RemoveResult {
  const stone = bag.stones.find(s => s.id === stoneId);
  if (!stone) return { success: false, reason: 'Stone not found' };
  if (bag.size <= MIN_BAG_SIZE) return { success: false, reason: `Cannot remove: minimum ${MIN_BAG_SIZE} stones required` };
  if (!spendGold(run, REMOVAL_COST)) return { success: false, reason: 'Insufficient gold' };
  const idx = bag.stones.indexOf(stone);
  bag.stones.splice(idx, 1);
  return { success: true, removedStone: stone };
}
