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

// ─── compressChain ────────────────────────────────────────────────────────────

import { compressChain } from '../board';

function tile(leftPip: number, rightPip: number, flipped = false): import('../board').BoardTile {
  return {
    id: randomUUID(),
    stone: { id: randomUUID(), leftPip, rightPip, element: null } as import('../models/stone').Stone,
    flipped,
    side: 'right',
    playedBy: 'player',
    turnNumber: 1,
  };
}

describe('compressChain', () => {
  it('returns chain unchanged when length <= 2', () => {
    const t1 = tile(5, 4);
    const t2 = tile(4, 1);
    expect(compressChain([t1])).toEqual([t1]);
    expect(compressChain([t1, t2])).toEqual([t1, t2]);
    expect(compressChain([])).toEqual([]);
  });

  it('compresses 8-tile chain to 3 tiles (spec example)', () => {
    // [5|4]-[4|1]-[1|3]-[3|5]-[5|2]-[2|4]-[4|6]-[6|1]
    // [5|4] outgoing=4 → furthest match: [4|6] at index 6
    // [4|6] outgoing=6 → furthest match: [6|1] at index 7
    // Result: [5|4]-[4|6]-[6|1]
    const t0 = tile(5, 4); // outgoing=4
    const t1 = tile(4, 1);
    const t2 = tile(1, 3);
    const t3 = tile(3, 5);
    const t4 = tile(5, 2);
    const t5 = tile(2, 4);
    const t6 = tile(4, 6); // outgoing=6
    const t7 = tile(6, 1);
    const result = compressChain([t0, t1, t2, t3, t4, t5, t6, t7]);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(t0.id);
    expect(result[1].id).toBe(t6.id);
    expect(result[2].id).toBe(t7.id);
  });

  it('returns chain unchanged when no shortcut exists', () => {
    // [1|2]-[2|3]-[3|4] — each only matches the next, no skipping possible
    const t0 = tile(1, 2);
    const t1 = tile(2, 3);
    const t2 = tile(3, 4);
    const result = compressChain([t0, t1, t2]);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(t0.id);
    expect(result[1].id).toBe(t1.id);
    expect(result[2].id).toBe(t2.id);
  });

  it('always takes the furthest match when multiple shortcuts exist', () => {
    // [2|4]-[4|1]-[4|3]-[4|6]
    // [2|4] outgoing=4 → matches t1(4|1), t2(4|3), t3(4|6) → furthest is t3
    // t3 is last → done
    // Result: [2|4]-[4|6]
    const t0 = tile(2, 4);
    const t1 = tile(4, 1);
    const t2 = tile(4, 3);
    const t3 = tile(4, 6);
    const result = compressChain([t0, t1, t2, t3]);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(t0.id);
    expect(result[1].id).toBe(t3.id);
  });

  it('uses display pips correctly for flipped tiles', () => {
    // t0: [3|5] not flipped → outgoing=5
    // t1: [6|5] flipped=true → left display pip = stone.rightPip=5, right display pip = stone.leftPip=6
    //     incoming=5 (matches outgoing of t0), outgoing=6
    // t2: [4|2] not flipped → incoming=4, no match with 6
    // t3: [1|6] not flipped → incoming=1, no match
    // t4: [6|2] not flipped → incoming=6 (matches outgoing of t1) → furthest match
    // Result: [3|5]-[6|5 flipped]-[6|2]
    const t0 = tile(3, 5);
    const t1 = tile(6, 5, true); // flipped: left display=5, right display=6
    const t2 = tile(4, 2);
    const t3 = tile(1, 6);
    const t4 = tile(6, 2);
    const result = compressChain([t0, t1, t2, t3, t4]);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(t0.id);
    expect(result[1].id).toBe(t1.id);
    expect(result[2].id).toBe(t4.id);
  });
});

// ─── toJSON / fromJSON ────────────────────────────────────────────────────────

describe('Board — serialization round-trip', () => {
  it('restores tiles, opens, and orderedTiles from JSON', () => {
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'player', 1);
    b.playStone(stone(0, 2), 'left', 'player', 1);
    const json = b.toJSON();
    const b2 = Board.fromJSON(json);
    expect(b2.leftOpen).toBe(b.leftOpen);
    expect(b2.rightOpen).toBe(b.rightOpen);
    const json2 = b2.toJSON();
    expect(json2.tiles).toHaveLength(json.tiles.length);
    expect(json2.orderedTiles).toHaveLength(json.orderedTiles.length);
  });
});
