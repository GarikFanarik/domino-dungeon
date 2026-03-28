import type { Stone } from './models/stone';
import { Chain } from './chain';
import type { PlacedStone } from './chain';

export interface BoardTile {
  id: string;
  stone: Stone;
  flipped: boolean;
  side: 'left' | 'right';
  playedBy: 'player' | 'enemy';
  turnNumber: number;
}

export interface BoardJSON {
  tiles: BoardTile[];
  orderedTiles: BoardTile[];
  leftOpen: number | null;
  rightOpen: number | null;
}

export class Board {
  private _tiles: BoardTile[] = [];
  private _orderedTiles: BoardTile[] = [];
  private _leftOpen: number | null = null;
  private _rightOpen: number | null = null;
  private _firstPlaced = false;

  get leftOpen(): number | null { return this._leftOpen; }
  get rightOpen(): number | null { return this._rightOpen; }

  canPlay(stone: Stone): { left: boolean; right: boolean } {
    if (this._tiles.length === 0) {
      return { left: false, right: true };
    }
    const left =
      this._leftOpen !== null &&
      (stone.leftPip === this._leftOpen || stone.rightPip === this._leftOpen);
    const right =
      this._rightOpen !== null &&
      (stone.leftPip === this._rightOpen || stone.rightPip === this._rightOpen);
    return { left, right };
  }

  playStone(
    stone: Stone,
    side: 'left' | 'right',
    playedBy: 'player' | 'enemy',
    turnNumber: number
  ): BoardTile {
    let flipped: boolean;

    if (!this._firstPlaced) {
      flipped = false;
      this._leftOpen = stone.leftPip;
      this._rightOpen = stone.rightPip;
      this._firstPlaced = true;
    } else if (side === 'right') {
      flipped = stone.rightPip === this._rightOpen!;
      this._rightOpen = flipped ? stone.leftPip : stone.rightPip;
    } else {
      // side === 'left'
      flipped = stone.leftPip === this._leftOpen!;
      this._leftOpen = flipped ? stone.rightPip : stone.leftPip;
    }

    const tile: BoardTile = {
      id: crypto.randomUUID(),
      stone,
      flipped,
      side,
      playedBy,
      turnNumber,
    };

    this._tiles.push(tile);
    if (side === 'left') {
      this._orderedTiles.unshift(tile);
    } else {
      this._orderedTiles.push(tile);
    }

    return tile;
  }

  getTilesForTurn(turnNumber: number, playedBy: 'player' | 'enemy'): BoardTile[] {
    return this._orderedTiles.filter(
      t => t.turnNumber === turnNumber && t.playedBy === playedBy
    );
  }

  toChainForTurn(turnNumber: number, playedBy: 'player' | 'enemy'): Chain {
    const tiles = this.getTilesForTurn(turnNumber, playedBy);
    // tile.flipped already encodes the display orientation (flipped ? rightPip : leftPip is
    // the left-face pip), so junctionValues correctly gets each stone's left-display pip.
    const placed: PlacedStone[] = tiles.map(tile => ({
      stone: tile.stone,
      side: 'right' as const,
      flipped: tile.flipped,
    }));
    return Chain.fromPlacedStones(placed);
  }

  /**
   * Sum the junction damage for all junctions where at least one of the two adjacent tiles
   * was played by `playedBy` on `turnNumber`. This counts cross-turn connections (e.g. a
   * player tile that extends an enemy tile from a prior turn) without accumulating all
   * historical junctions (which would cause runaway damage escalation).
   *
   * Junction damage formula: leftDisplayPip of the right tile × 2  (same as calculateDamage).
   */
  activeDamageForTurn(turnNumber: number, playedBy: 'player' | 'enemy'): number {
    let sum = 0;
    for (let i = 0; i < this._orderedTiles.length - 1; i++) {
      const a = this._orderedTiles[i];
      const b = this._orderedTiles[i + 1];
      const aIsActive = a.turnNumber === turnNumber && a.playedBy === playedBy;
      const bIsActive = b.turnNumber === turnNumber && b.playedBy === playedBy;
      if (aIsActive || bIsActive) {
        const pip = b.flipped ? b.stone.rightPip : b.stone.leftPip;
        sum += pip * 2;
      }
    }
    return sum;
  }

  /**
   * Per-tile damage contribution in **play order** (insertion order), suitable for
   * driving a progressive damage counter during the reveal animation.
   *
   * Each tile is credited with the junction it CREATED at the moment it was placed:
   *   right-side: tile.leftDisplayPip × 2  (connected to whatever was on its left)
   *               → 0 if the left-chain-neighbor is a later-placed tile from this turn
   *                 (means the board was empty/left-open was filled afterwards)
   *   left-side:  rightNeighbor.leftDisplayPip × 2  (old leftmost tile shifted right)
   */
  perTileDamageForTurn(turnNumber: number, playedBy: 'player' | 'enemy'): number[] {
    const playOrderTiles = this._tiles.filter(
      t => t.turnNumber === turnNumber && t.playedBy === playedBy
    );
    if (playOrderTiles.length === 0) return [];

    const playOrderIdx = new Map<string, number>();
    playOrderTiles.forEach((t, i) => playOrderIdx.set(t.id, i));

    const chainIdxMap = new Map<string, number>();
    this._orderedTiles.forEach((t, i) => {
      if (playOrderIdx.has(t.id)) chainIdxMap.set(t.id, i);
    });

    const ldp = (t: BoardTile) => (t.flipped ? t.stone.rightPip : t.stone.leftPip);

    return playOrderTiles.map(t => {
      const ci = chainIdxMap.get(t.id)!;
      if (t.side === 'right') {
        const left = this._orderedTiles[ci - 1];
        if (!left) return 0;
        // Left neighbor is a later-placed tile from this turn → board was empty at placement.
        if (playOrderIdx.has(left.id) && playOrderIdx.get(left.id)! > playOrderIdx.get(t.id)!) return 0;
        return ldp(t) * 2;
      } else {
        const right = this._orderedTiles[ci + 1];
        return right ? ldp(right) * 2 : 0;
      }
    });
  }

  /** Build a Chain from every tile on the board (all turns, all players, in chain order). */
  toChain(): Chain {
    const placed: PlacedStone[] = this._orderedTiles.map(tile => ({
      stone: tile.stone,
      side: 'right' as const,
      flipped: tile.flipped,
    }));
    return Chain.fromPlacedStones(placed);
  }

  toJSON(): BoardJSON {
    return {
      tiles: [...this._tiles],
      orderedTiles: [...this._orderedTiles],
      leftOpen: this._leftOpen,
      rightOpen: this._rightOpen,
    };
  }

  static fromJSON(json: BoardJSON): Board {
    const b = new Board();
    b._tiles = json.tiles;
    b._orderedTiles = json.orderedTiles;
    b._leftOpen = json.leftOpen;
    b._rightOpen = json.rightOpen;
    b._firstPlaced = json.tiles.length > 0;
    return b;
  }
}

/**
 * Returns the pip value that a tile used to connect to the board when it was played.
 * This is the pip that matched the open end at the time of placement.
 */
export function tileConnectingPip(tile: BoardTile): number {
  // (side === 'right') === flipped is true when the right pip is the connecting pip
  const useRight = (tile.side === 'right') === tile.flipped;
  return useRight ? tile.stone.rightPip : tile.stone.leftPip;
}

/**
 * Greedy chain compression: finds the shortest subsequence of tiles that
 * preserves the start and end, by always jumping to the furthest tile whose
 * incoming display pip matches the current tile's outgoing display pip.
 *
 * Display pips account for tile.flipped:
 *   left display pip  = flipped ? stone.rightPip : stone.leftPip
 *   right display pip = flipped ? stone.leftPip  : stone.rightPip
 */
export function compressChain(tiles: BoardTile[]): BoardTile[] {
  if (tiles.length <= 2) return tiles;

  function leftDisplay(t: BoardTile): number {
    return t.flipped ? t.stone.rightPip : t.stone.leftPip;
  }
  function rightDisplay(t: BoardTile): number {
    return t.flipped ? t.stone.leftPip : t.stone.rightPip;
  }

  const result: BoardTile[] = [tiles[0]];
  let current = 0;

  while (current < tiles.length - 1) {
    const outgoing = rightDisplay(tiles[current]);
    // Find the furthest tile (from the end) whose incoming pip matches
    let furthest = current + 1;
    for (let i = tiles.length - 1; i > current + 1; i--) {
      if (leftDisplay(tiles[i]) === outgoing) {
        furthest = i;
        break;
      }
    }
    result.push(tiles[furthest]);
    current = furthest;
  }

  return result;
}
