import { Hand } from '../hand';
import { Bag } from '../bag';
import { Stone } from '../models/stone';

function makeStone(left: number, right: number, id?: string): Stone {
  return {
    id: id ?? `stone-${left}-${right}`,
    leftPip: left,
    rightPip: right,
    element: null,
  };
}

describe('Hand', () => {
  describe('drawFromBag', () => {
    it('draws stones into hand from bag', () => {
      const bag = new Bag();
      const hand = new Hand();
      const drawn = hand.drawFromBag(bag, 5);
      expect(drawn.length).toBe(5);
      expect(hand.size).toBe(5);
    });

    it('drawn stones are removed from the bag', () => {
      const bag = new Bag();
      const hand = new Hand();
      hand.drawFromBag(bag, 5);
      expect(bag.size).toBe(23);
    });

    it('respects MAX_SIZE and will not exceed 7 stones', () => {
      const bag = new Bag();
      const hand = new Hand();
      hand.drawFromBag(bag, 7);
      // Try to draw more — hand is already full
      const extra = hand.drawFromBag(bag, 3);
      expect(extra.length).toBe(0);
      expect(hand.size).toBe(Hand.MAX_SIZE);
    });

    it('draws only up to MAX_SIZE even when more are requested', () => {
      const bag = new Bag();
      const hand = new Hand();
      // Pre-fill hand with 5 stones
      hand.drawFromBag(bag, 5);
      // Only 2 slots left; request 5
      const drawn = hand.drawFromBag(bag, 5);
      expect(drawn.length).toBe(2);
      expect(hand.size).toBe(Hand.MAX_SIZE);
    });
  });

  describe('playStone', () => {
    it('removes stone from hand and returns it', () => {
      const stone = makeStone(3, 4, 'test-id-1');
      const hand = new Hand([stone]);
      const played = hand.playStone('test-id-1');
      expect(played).toBe(stone);
      expect(hand.size).toBe(0);
    });

    it('removes only the target stone, leaving others intact', () => {
      const stoneA = makeStone(1, 2, 'id-a');
      const stoneB = makeStone(3, 4, 'id-b');
      const stoneC = makeStone(5, 6, 'id-c');
      const hand = new Hand([stoneA, stoneB, stoneC]);
      hand.playStone('id-b');
      expect(hand.size).toBe(2);
      expect(hand.stones.find((s) => s.id === 'id-b')).toBeUndefined();
    });

    it('throws an error when stone is not found', () => {
      const hand = new Hand([makeStone(0, 0, 'existing-id')]);
      expect(() => hand.playStone('nonexistent-id')).toThrow(
        'Stone with id "nonexistent-id" not found in hand'
      );
    });

    it('throws when playing from an empty hand', () => {
      const hand = new Hand([]);
      expect(() => hand.playStone('any-id')).toThrow();
    });
  });

  describe('toJSON / fromJSON', () => {
    it('roundtrips correctly', () => {
      const stones = [makeStone(1, 2, 'id-1'), makeStone(3, 4, 'id-2')];
      const hand = new Hand(stones);
      const json = hand.toJSON();
      const restored = Hand.fromJSON(json);
      expect(restored.size).toBe(hand.size);
      expect(restored.stones.map((s) => s.id)).toEqual(['id-1', 'id-2']);
    });

    it('preserves pip values after roundtrip', () => {
      const hand = new Hand([makeStone(2, 5, 'id-x')]);
      const restored = Hand.fromJSON(hand.toJSON());
      expect(restored.stones[0].leftPip).toBe(2);
      expect(restored.stones[0].rightPip).toBe(5);
    });

    it('restores an empty hand', () => {
      const hand = new Hand([]);
      const restored = Hand.fromJSON(hand.toJSON());
      expect(restored.size).toBe(0);
    });
  });
});
