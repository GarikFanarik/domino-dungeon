import { Stone, ElementType, stoneMatchesChain, stoneTotalPips } from '../stone';

function makeStone(leftPip: number, rightPip: number): Stone {
  return { id: `stone-${leftPip}-${rightPip}`, leftPip, rightPip, element: null };
}

describe('stoneMatchesChain', () => {
  it('returns true when left pip matches open pip', () => {
    const stone = makeStone(3, 5);
    expect(stoneMatchesChain(stone, 3)).toBe(true);
  });

  it('returns true when right pip matches open pip', () => {
    const stone = makeStone(3, 5);
    expect(stoneMatchesChain(stone, 5)).toBe(true);
  });

  it('returns false when neither pip matches open pip', () => {
    const stone = makeStone(3, 5);
    expect(stoneMatchesChain(stone, 4)).toBe(false);
  });

  it('returns false when open pip is 0 and stone has no zeros', () => {
    const stone = makeStone(2, 6);
    expect(stoneMatchesChain(stone, 0)).toBe(false);
  });
});

describe('stoneTotalPips', () => {
  it('returns the sum of left and right pips', () => {
    const stone = makeStone(3, 4);
    expect(stoneTotalPips(stone)).toBe(7);
  });

  it('returns double the pip value for a double stone', () => {
    const stone = makeStone(6, 6);
    expect(stoneTotalPips(stone)).toBe(12);
  });

  it('returns 0 for a double-blank stone', () => {
    const stone = makeStone(0, 0);
    expect(stoneTotalPips(stone)).toBe(0);
  });

  it('returns correct sum for a stone with a zero pip', () => {
    const stone = makeStone(0, 5);
    expect(stoneTotalPips(stone)).toBe(5);
  });
});
