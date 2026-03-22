import { Bag } from '../bag';
import { Stone } from '../models/stone';

function makeStone(left: number, right: number): Stone {
  return { id: `stone-${left}-${right}`, leftPip: left, rightPip: right, element: null };
}

describe('Bag', () => {
  describe('generateFullSet', () => {
    it('returns exactly 28 stones', () => {
      const bag = new Bag();
      expect(bag.size).toBe(28);
    });

    it('contains all pip combinations from 0-0 through 6-6', () => {
      const bag = new Bag();
      const combos = new Set<string>();
      for (let left = 0; left <= 6; left++) {
        for (let right = left; right <= 6; right++) {
          combos.add(`${left}-${right}`);
        }
      }
      for (const stone of bag.stones) {
        const key = `${stone.leftPip}-${stone.rightPip}`;
        expect(combos.has(key)).toBe(true);
        combos.delete(key);
      }
      expect(combos.size).toBe(0);
    });

    it('sets element to null for all generated stones', () => {
      const bag = new Bag();
      for (const stone of bag.stones) {
        expect(stone.element).toBeNull();
      }
    });
  });

  describe('draw', () => {
    it('reduces bag size by the number drawn', () => {
      const bag = new Bag();
      bag.draw(5);
      expect(bag.size).toBe(23);
    });

    it('returns the correct number of stones', () => {
      const bag = new Bag();
      const drawn = bag.draw(7);
      expect(drawn.length).toBe(7);
    });

    it('returns all remaining stones when bag has fewer than requested', () => {
      const bag = new Bag([makeStone(0, 0), makeStone(1, 1), makeStone(2, 2)]);
      const drawn = bag.draw(10);
      expect(drawn.length).toBe(3);
      expect(bag.size).toBe(0);
    });

    it('removes drawn stones from the bag', () => {
      const bag = new Bag();
      const initialSize = bag.size;
      const drawn = bag.draw(3);
      expect(bag.size).toBe(initialSize - drawn.length);
    });
  });

  describe('shuffle', () => {
    it('changes the order of stones after shuffling', () => {
      const bag = new Bag();
      const originalOrder = bag.stones.map((s) => s.id);

      let shuffled = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        bag.shuffle();
        const newOrder = bag.stones.map((s) => s.id);
        if (newOrder.join(',') !== originalOrder.join(',')) {
          shuffled = true;
          break;
        }
      }
      expect(shuffled).toBe(true);
    });

    it('keeps the same stones after shuffling', () => {
      const bag = new Bag();
      const idsBefore = new Set(bag.stones.map((s) => s.id));
      bag.shuffle();
      const idsAfter = new Set(bag.stones.map((s) => s.id));
      expect(idsAfter).toEqual(idsBefore);
    });
  });

  describe('addStone', () => {
    it('increases bag size by one', () => {
      const bag = new Bag();
      const before = bag.size;
      bag.addStone(makeStone(3, 4));
      expect(bag.size).toBe(before + 1);
    });

    it('the added stone is present in the bag', () => {
      const bag = new Bag([]);
      const stone = makeStone(2, 5);
      bag.addStone(stone);
      expect(bag.stones).toContain(stone);
    });
  });

  describe('toJSON / fromJSON', () => {
    it('roundtrips correctly', () => {
      const bag = new Bag();
      const json = bag.toJSON();
      const restored = Bag.fromJSON(json);
      expect(restored.size).toBe(bag.size);
      expect(restored.stones.map((s) => s.id)).toEqual(bag.stones.map((s) => s.id));
    });

    it('preserves stone pip values after roundtrip', () => {
      const bag = new Bag([makeStone(1, 3), makeStone(4, 6)]);
      const json = bag.toJSON();
      const restored = Bag.fromJSON(json);
      expect(restored.stones[0].leftPip).toBe(1);
      expect(restored.stones[0].rightPip).toBe(3);
      expect(restored.stones[1].leftPip).toBe(4);
      expect(restored.stones[1].rightPip).toBe(6);
    });
  });
});
