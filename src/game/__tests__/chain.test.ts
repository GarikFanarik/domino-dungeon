import { Chain } from '../chain';
import { Stone } from '../models/stone';

function makeStone(id: string, leftPip: number, rightPip: number): Stone {
  return { id, leftPip, rightPip, element: null };
}

describe('Chain — empty chain', () => {
  it('canPlay returns {left: false, right: true} before any stone is placed', () => {
    const chain = new Chain();
    const stone = makeStone('s1', 3, 5);
    expect(chain.canPlay(stone)).toEqual({ left: false, right: true });
  });
});

describe('Chain — first stone placement', () => {
  it('sets leftOpen and rightOpen correctly when not flipped', () => {
    const chain = new Chain();
    const stone = makeStone('s1', 2, 4);
    chain.playStone(stone, 'right', false);
    expect(chain.leftOpen).toBe(2);
    expect(chain.rightOpen).toBe(4);
  });

  it('sets leftOpen and rightOpen correctly when flipped', () => {
    const chain = new Chain();
    const stone = makeStone('s1', 2, 4);
    chain.playStone(stone, 'right', true);
    expect(chain.leftOpen).toBe(4);
    expect(chain.rightOpen).toBe(2);
  });
});

describe('Chain — canPlay after first stone (right-only)', () => {
  it('left is always false', () => {
    const chain = new Chain();
    chain.playStone(makeStone('s1', 3, 5), 'right', false);
    const stone = makeStone('s2', 3, 1);
    expect(chain.canPlay(stone).left).toBe(false);
  });

  it('returns true for right when leftPip matches rightOpen', () => {
    const chain = new Chain();
    chain.playStone(makeStone('s1', 3, 5), 'right', false);
    // rightOpen=5
    const stone = makeStone('s2', 5, 2);
    expect(chain.canPlay(stone).right).toBe(true);
  });

  it('returns true for right when rightPip matches rightOpen', () => {
    const chain = new Chain();
    chain.playStone(makeStone('s1', 3, 5), 'right', false);
    // rightOpen=5
    const stone = makeStone('s2', 2, 5);
    expect(chain.canPlay(stone).right).toBe(true);
  });

  it('returns false for right when neither pip matches rightOpen', () => {
    const chain = new Chain();
    chain.playStone(makeStone('s1', 3, 5), 'right', false);
    // rightOpen=5
    const stone = makeStone('s2', 1, 4);
    expect(chain.canPlay(stone).right).toBe(false);
  });
});

describe('Chain — doubles', () => {
  it('a double can be placed when its pip matches rightOpen', () => {
    const chain = new Chain();
    chain.playStone(makeStone('s1', 3, 5), 'right', false);
    // rightOpen=5
    const double5 = makeStone('s2', 5, 5);
    expect(chain.canPlay(double5).right).toBe(true);
    expect(chain.canPlay(double5).left).toBe(false);
  });

  it('a double placed on the right updates rightOpen correctly', () => {
    const chain = new Chain();
    chain.playStone(makeStone('s1', 3, 5), 'right', false);
    // rightOpen=5
    const double5 = makeStone('s2', 5, 5);
    chain.playStone(double5, 'right', false);
    expect(chain.rightOpen).toBe(5);
  });
});

describe('Chain — playStone updates open ends (right side)', () => {
  it('playing on right updates rightOpen', () => {
    const chain = new Chain();
    chain.playStone(makeStone('s1', 3, 5), 'right', false);
    // rightOpen=5
    chain.playStone(makeStone('s2', 5, 2), 'right', false);
    expect(chain.rightOpen).toBe(2);
  });

  it('playing on right flipped updates rightOpen from leftPip', () => {
    const chain = new Chain();
    chain.playStone(makeStone('s1', 3, 5), 'right', false);
    // rightOpen=5
    chain.playStone(makeStone('s2', 2, 5), 'right', true);
    expect(chain.rightOpen).toBe(2);
  });
});

describe('Chain — length', () => {
  it('starts at 0', () => {
    const chain = new Chain();
    expect(chain.length).toBe(0);
  });

  it('increments by 1 with each stone played', () => {
    const chain = new Chain();
    chain.playStone(makeStone('s1', 3, 5), 'right', false);
    expect(chain.length).toBe(1);
    chain.playStone(makeStone('s2', 5, 2), 'right', false);
    expect(chain.length).toBe(2);
    chain.playStone(makeStone('s3', 2, 4), 'right', false);
    expect(chain.length).toBe(3);
  });
});

describe('Chain — toJSON / fromJSON', () => {
  it('round-trips through JSON correctly', () => {
    const chain = new Chain();
    chain.playStone(makeStone('s1', 3, 5), 'right', false);
    chain.playStone(makeStone('s2', 5, 2), 'right', false);

    const json = chain.toJSON() as any;
    const restored = Chain.fromJSON(json);

    expect(restored.leftOpen).toBe(chain.leftOpen);
    expect(restored.rightOpen).toBe(chain.rightOpen);
    expect(restored.length).toBe(chain.length);
  });
});
