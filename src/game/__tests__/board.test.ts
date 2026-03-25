import { randomUUID } from 'crypto';
import { Board, BoardTile } from '../board';
import type { Stone } from '../models/stone';
import { Chain } from '../chain';

function stone(leftPip: number, rightPip: number, element: string | null = null): Stone {
  return { id: randomUUID(), leftPip, rightPip, element } as Stone;
}

// ─── canPlay ────────────────────────────────────────────────────────────────

describe('Board.canPlay — empty board', () => {
  it('returns { left: false, right: true } for any stone', () => {
    const b = new Board();
    expect(b.canPlay(stone(3, 5))).toEqual({ left: false, right: true });
    expect(b.canPlay(stone(1, 1))).toEqual({ left: false, right: true });
  });
});

describe('Board.canPlay — after first tile', () => {
  it('right=true when leftPip matches rightOpen', () => {
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'player', 1);
    // rightOpen=4
    expect(b.canPlay(stone(4, 6)).right).toBe(true);
  });

  it('right=true when rightPip matches rightOpen', () => {
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'player', 1);
    expect(b.canPlay(stone(1, 4)).right).toBe(true);
  });

  it('right=false when no pip matches rightOpen', () => {
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'player', 1);
    expect(b.canPlay(stone(1, 3)).right).toBe(false);
  });

  it('left=true when leftPip matches leftOpen', () => {
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'player', 1);
    // leftOpen=2
    expect(b.canPlay(stone(1, 2)).left).toBe(true);
  });

  it('left=true when rightPip matches leftOpen', () => {
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'player', 1);
    expect(b.canPlay(stone(2, 5)).left).toBe(true);
  });

  it('left=false when no pip matches leftOpen', () => {
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'player', 1);
    expect(b.canPlay(stone(3, 5)).left).toBe(false);
  });
});

// ─── playStone — flipped + open ends ────────────────────────────────────────

describe('Board.playStone — first stone', () => {
  it('sets leftOpen and rightOpen from leftPip and rightPip', () => {
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'player', 1);
    expect(b.leftOpen).toBe(2);
    expect(b.rightOpen).toBe(4);
  });

  it('flipped=false for first stone (rightOpen is null)', () => {
    const b = new Board();
    const tile = b.playStone(stone(2, 4), 'right', 'player', 1);
    expect(tile.flipped).toBe(false);
  });
});

describe('Board.playStone — right-end flipped logic', () => {
  it('flipped=false when leftPip matches rightOpen', () => {
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'player', 1); // rightOpen=4
    const tile = b.playStone(stone(4, 6), 'right', 'player', 1);
    expect(tile.flipped).toBe(false);
    expect(b.rightOpen).toBe(6);
  });

  it('flipped=true when rightPip matches rightOpen', () => {
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'player', 1); // rightOpen=4
    const tile = b.playStone(stone(1, 4), 'right', 'player', 1);
    expect(tile.flipped).toBe(true);
    expect(b.rightOpen).toBe(1);
  });
});

describe('Board.playStone — left-end flipped logic', () => {
  it('flipped=false when rightPip matches leftOpen', () => {
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'player', 1); // leftOpen=2
    const tile = b.playStone(stone(0, 2), 'left', 'player', 1);
    expect(tile.flipped).toBe(false);
    expect(b.leftOpen).toBe(0);
  });

  it('flipped=true when leftPip matches leftOpen', () => {
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'player', 1); // leftOpen=2
    const tile = b.playStone(stone(2, 5), 'left', 'player', 1);
    expect(tile.flipped).toBe(true);
    expect(b.leftOpen).toBe(5);
  });
});

// ─── orderedTiles ────────────────────────────────────────────────────────────

describe('Board — orderedTiles ordering', () => {
  it('right-end plays append to the end', () => {
    const b = new Board();
    const s1 = stone(1, 3);
    const s2 = stone(3, 5);
    b.playStone(s1, 'right', 'player', 1);
    b.playStone(s2, 'right', 'player', 1);
    const ids = b.toJSON().orderedTiles.map(t => t.stone.id);
    expect(ids).toEqual([s1.id, s2.id]);
  });

  it('left-end plays prepend to the front', () => {
    const b = new Board();
    const s1 = stone(2, 4);
    const s2 = stone(0, 2);
    b.playStone(s1, 'right', 'player', 1); // leftOpen=2
    b.playStone(s2, 'left', 'player', 1);  // prepended
    const ids = b.toJSON().orderedTiles.map(t => t.stone.id);
    expect(ids).toEqual([s2.id, s1.id]);
  });
});

// ─── getTilesForTurn ─────────────────────────────────────────────────────────

describe('Board.getTilesForTurn', () => {
  it('returns only tiles matching turnNumber and playedBy', () => {
    const b = new Board();
    const s1 = stone(1, 3);
    const s2 = stone(3, 5);
    const s3 = stone(5, 2);
    b.playStone(s1, 'right', 'player', 1);
    b.playStone(s2, 'right', 'enemy', 1);
    b.playStone(s3, 'right', 'player', 2);
    const playerTurn1 = b.getTilesForTurn(1, 'player');
    expect(playerTurn1).toHaveLength(1);
    expect(playerTurn1[0].stone.id).toBe(s1.id);
  });

  it('returns empty array when no tiles match', () => {
    const b = new Board();
    expect(b.getTilesForTurn(5, 'player')).toHaveLength(0);
  });
});

// ─── toChainForTurn ───────────────────────────────────────────────────────────

describe('Board.toChainForTurn', () => {
  it('right-end tile: chainFlipped = tile.flipped (direct copy)', () => {
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'player', 1); // rightOpen=4, flipped=false
    b.playStone(stone(1, 4), 'right', 'player', 1); // rightPip matches → flipped=true
    const chain = b.toChainForTurn(1, 'player');
    // Second stone: tile.flipped=true → chainFlipped=true → junction pip = rightPip = 4
    expect(chain.stones[1].flipped).toBe(true);
  });

  it('left-end tile: chainFlipped = !tile.flipped (inverted)', () => {
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'player', 1); // leftOpen=2
    b.playStone(stone(0, 2), 'left', 'player', 1);  // rightPip=2 matches → flipped=false
    const chain = b.toChainForTurn(1, 'player');
    // Left tile: tile.flipped=false → chainFlipped=true (inverted)
    // junction pip = rightPip of stone(0,2) = 2 (via chain.flipped=true → rightPip)
    expect(chain.stones[0].flipped).toBe(true);
  });

  it('produces correct junction damage for right-end play', () => {
    // rightOpen=3, play stone [2|3]: flipped=true (rightPip=3 matches), junction=3, damage=3*2=6
    const { calculateDamage } = require('../damage');
    const b = new Board();
    b.playStone(stone(1, 3), 'right', 'player', 1); // rightOpen=3
    b.playStone(stone(2, 3), 'right', 'player', 1); // flipped=true, junction pip=3
    const chain = b.toChainForTurn(1, 'player');
    const dmg = calculateDamage(chain, {});
    expect(dmg.finalDamage).toBe(6); // 3 * 2
  });

  it('produces correct junction damage for left-end play', () => {
    // leftOpen=5, play stone [5|1]: flipped=true (leftPip=5 matches), junction=5, damage=5*2=10
    const { calculateDamage } = require('../damage');
    const b = new Board();
    b.playStone(stone(5, 3), 'right', 'player', 1); // leftOpen=5
    b.playStone(stone(5, 1), 'left', 'player', 1);  // flipped=true (leftPip=5 matches leftOpen)
    const chain = b.toChainForTurn(1, 'player');
    const dmg = calculateDamage(chain, {});
    expect(dmg.finalDamage).toBe(10); // 5 * 2
  });

  it('returns Chain with leftOpen/rightOpen null', () => {
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'player', 1);
    const chain = b.toChainForTurn(1, 'player');
    expect(chain.leftOpen).toBeNull();
    expect(chain.rightOpen).toBeNull();
  });
});

// ─── snake layout ─────────────────────────────────────────────────────────────

describe('Board — snake layout positions', () => {
  it('first tile placed at (10, 4)', () => {
    const b = new Board();
    const tile = b.playStone(stone(2, 4), 'right', 'player', 1);
    expect(tile.x).toBe(10);
    expect(tile.y).toBe(4);
  });

  it('second right-end tile placed at (12, 4)', () => {
    const b = new Board();
    b.playStone(stone(1, 3), 'right', 'player', 1);
    const tile = b.playStone(stone(3, 5), 'right', 'player', 1);
    expect(tile.x).toBe(12);
    expect(tile.y).toBe(4);
  });

  it('first left-end tile placed at (8, 4)', () => {
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'player', 1); // leftOpen=2
    const tile = b.playStone(stone(0, 2), 'left', 'player', 1);
    expect(tile.x).toBe(8);
    expect(tile.y).toBe(4);
  });

  it('rightHead wraps to next row at maxCol', () => {
    let b2 = new Board();
    let s = stone(1, 3);
    b2.playStone(s, 'right', 'player', 1); // (10,4), rightOpen=3
    for (let i = 0; i < 3; i++) {
      s = stone(3, 3); // double 3 keeps rightOpen=3
      b2.playStone(s, 'right', 'player', 1);
    }
    // 5th additional right tile → should be at (18, 4)
    const t5 = b2.playStone(stone(3, 3), 'right', 'player', 1);
    expect(t5.x).toBe(18);
    expect(t5.y).toBe(4);
    // 6th: rightHead wrapped to (20, 5, left); tile placed at (20, 5)
    const t6 = b2.playStone(stone(3, 3), 'right', 'player', 1);
    expect(t6.x).toBe(20);
    expect(t6.y).toBe(5);
  });

  it('leftHead advances mirroring rightHead (left direction, wraps down)', () => {
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'player', 1); // first tile (10,4); leftOpen=2
    b.playStone(stone(0, 2), 'left', 'player', 1); // (8,4); leftOpen=0
    b.playStone(stone(3, 0), 'left', 'player', 1); // (6,4); leftOpen=3
    b.playStone(stone(1, 3), 'left', 'player', 1); // (4,4); leftOpen=1
    const t5 = b.playStone(stone(5, 1), 'left', 'player', 1); // (2,4); leftOpen=5
    expect(t5.x).toBe(2);
    expect(t5.y).toBe(4);
    const t6 = b.playStone(stone(3, 5), 'left', 'player', 1); // (0,4); leftOpen=3
    expect(t6.x).toBe(0);
    expect(t6.y).toBe(4);
    const t7 = b.playStone(stone(1, 3), 'left', 'player', 1); // leftHead wrapped; tile at row 5
    expect(t7.y).toBe(5);
  });

  it('collision extends maxCol by 4', () => {
    const b = new Board();
    b.playStone(stone(1, 1), 'right', 'player', 1); // (10,4); rightOpen=1
    for (let i = 0; i < 10; i++) {
      b.playStone(stone(1, 1), 'right', 'player', 1);
    }
    const json = b.toJSON();
    const positions = json.tiles.map((t: any) => `${t.x},${t.y}`);
    const unique = new Set(positions);
    expect(unique.size).toBe(positions.length); // no two tiles share the same grid cell
  });
});

// ─── toJSON / fromJSON ────────────────────────────────────────────────────────

describe('Board — serialization round-trip', () => {
  it('restores tiles, opens, and head state from JSON', () => {
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'player', 1);
    b.playStone(stone(0, 2), 'left', 'player', 1);
    const json = b.toJSON();
    const b2 = Board.fromJSON(json);
    expect(b2.leftOpen).toBe(b.leftOpen);
    expect(b2.rightOpen).toBe(b.rightOpen);
    const json2 = b2.toJSON();
    expect(json2.rightHead).toEqual(json.rightHead);
    expect(json2.leftHead).toEqual(json.leftHead);
    expect(json2.maxCol).toBe(json.maxCol);
    expect(json2.tiles).toHaveLength(json.tiles.length);
  });
});
