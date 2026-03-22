import { Hand } from '../hand';
import { Bag } from '../bag';
import { swapStone } from '../swap';
import { Stone } from '../models/stone';

function makeStone(id: string, leftPip: number, rightPip: number): Stone {
  return { id, leftPip, rightPip, element: null };
}

function makeHandWithStones(stones: Stone[]): Hand {
  return new Hand(stones);
}

function makeBagWithStones(stones: Stone[]): Bag {
  return new Bag(stones);
}

describe('swapStone', () => {
  it('removes the specified stone from the hand and adds a new one', () => {
    const stoneA = makeStone('a', 1, 2);
    const stoneB = makeStone('b', 3, 4);
    const stoneC = makeStone('c', 5, 6);

    const hand = makeHandWithStones([stoneA, stoneB]);
    const bag = makeBagWithStones([stoneC]);

    const result = swapStone(hand, bag, 'a', 0, 1);

    expect(result.removedStone).toEqual(stoneA);
    // hand should contain the drawn stone (removed stone goes back to bag, so it may be redrawn)
    expect(hand.stones.find((s) => s.id === result.drawnStone.id)).toBeDefined();
  });

  it('hand size stays the same after swap', () => {
    const stoneA = makeStone('a', 1, 2);
    const stoneB = makeStone('b', 3, 4);
    const stoneC = makeStone('c', 5, 6);

    const hand = makeHandWithStones([stoneA, stoneB]);
    const bag = makeBagWithStones([stoneC]);
    const sizeBefore = hand.size;

    swapStone(hand, bag, 'a', 0, 1);

    expect(hand.size).toBe(sizeBefore);
  });

  it('throws when swapsUsed >= swapsPerTurn', () => {
    const stoneA = makeStone('a', 1, 2);
    const hand = makeHandWithStones([stoneA]);
    const bag = makeBagWithStones([makeStone('b', 3, 4)]);

    expect(() => swapStone(hand, bag, 'a', 1, 1)).toThrow('No swaps remaining this turn');
    expect(() => swapStone(hand, bag, 'a', 2, 1)).toThrow('No swaps remaining this turn');
  });

  it('throws when stone is not found in hand', () => {
    const stoneA = makeStone('a', 1, 2);
    const hand = makeHandWithStones([stoneA]);
    const bag = makeBagWithStones([makeStone('b', 3, 4)]);

    expect(() => swapStone(hand, bag, 'nonexistent-id', 0, 1)).toThrow(
      'Stone with id "nonexistent-id" not found in hand'
    );
  });

  it('returns the correct removedStone and drawnStone', () => {
    const stoneA = makeStone('a', 1, 2);
    const stoneB = makeStone('b', 3, 4);
    const bagStone = makeStone('bag-1', 6, 6);

    const hand = makeHandWithStones([stoneA, stoneB]);
    const bag = makeBagWithStones([bagStone]);

    const result = swapStone(hand, bag, 'b', 0, 2);

    expect(result.removedStone.id).toBe('b');
    // drawnStone should be the only stone that was in the bag or the removed stone
    // (after shuffle, the bag had bagStone + stoneB; one is drawn)
    expect(result.drawnStone).toBeDefined();
    expect(typeof result.drawnStone.id).toBe('string');
  });

  it('the removed stone is put back into the bag before drawing', () => {
    // Bag starts empty; after adding the removed stone there is exactly 1 stone to draw.
    const stoneA = makeStone('a', 2, 3);
    const hand = makeHandWithStones([stoneA]);
    const bag = makeBagWithStones([]); // empty bag

    // Because the removed stone goes back into the bag, draw should succeed
    const result = swapStone(hand, bag, 'a', 0, 1);
    expect(result.drawnStone).toBeDefined();
  });
});
