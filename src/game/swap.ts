import { Hand } from './hand';
import { Bag } from './bag';
import { Stone } from './models/stone';

export interface SwapResult {
  removedStone: Stone;
  drawnStone: Stone;
}

// Swap a stone from hand back to bag, draw a new one.
// Throws if no swaps remaining this turn or if the stone is not in the hand.
export function swapStone(
  hand: Hand,
  bag: Bag,
  stoneId: string,
  swapsUsed: number,
  swapsPerTurn: number
): SwapResult {
  if (swapsUsed >= swapsPerTurn) {
    throw new Error('No swaps remaining this turn');
  }

  const removedStone = hand.playStone(stoneId); // removes from hand; throws if not found
  bag.addStone(removedStone); // put back in bag
  bag.shuffle(); // re-shuffle so draw is random

  const [drawnStone] = bag.draw(1); // draw replacement
  if (!drawnStone) {
    throw new Error('Bag is empty');
  }

  hand.stones.push(drawnStone); // add to hand directly

  return { removedStone, drawnStone };
}
