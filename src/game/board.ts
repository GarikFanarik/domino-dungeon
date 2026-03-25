import { randomUUID } from 'crypto';
import type { Stone } from './models/stone';
import { Chain, PlacedStone } from './chain';

export interface BoardTile {
  id: string;
  stone: Stone;
  x: number;
  y: number;
  orientation: 'h' | 'v';
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
  rightHead: { x: number; y: number; dir: 'right' | 'left' };
  leftHead: { x: number; y: number; dir: 'right' | 'left' };
  maxCol: number;
}

export class Board {
  private _tiles: BoardTile[] = [];
  private _orderedTiles: BoardTile[] = [];
  private _leftOpen: number | null = null;
  private _rightOpen: number | null = null;
  private _rightHead: { x: number; y: number; dir: 'right' | 'left' } = { x: 12, y: 4, dir: 'right' };
  private _leftHead: { x: number; y: number; dir: 'right' | 'left' } = { x: 8, y: 4, dir: 'left' };
  private _maxCol: number = 20;
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
    let x: number;
    let y: number;

    if (!this._firstPlaced) {
      // First tile always goes to right, at grid centre
      flipped = false;
      x = 10;
      y = 4;
      this._leftOpen = stone.leftPip;
      this._rightOpen = stone.rightPip;
      this._rightHead = { x: 12, y: 4, dir: 'right' };
      this._leftHead = { x: 8, y: 4, dir: 'left' };
      this._firstPlaced = true;
    } else if (side === 'right') {
      flipped = stone.rightPip === this._rightOpen!;
      // Update rightOpen
      this._rightOpen = flipped ? stone.leftPip : stone.rightPip;
      // Collision check
      const occupied = this._tiles.some(t => t.x === this._rightHead.x && t.y === this._rightHead.y);
      if (occupied) {
        this._maxCol += 4;
        this._rightHead.dir = 'right';
        this._rightHead.x = this._maxCol - 2;
        this._rightHead.y = this._rightHead.y; // keep row
      }
      x = this._rightHead.x;
      y = this._rightHead.y;
      // Advance rightHead
      if (this._rightHead.dir === 'right') {
        this._rightHead.x += 2;
        if (this._rightHead.x + 1 >= this._maxCol) {
          this._rightHead.y = Math.min(this._rightHead.y + 1, 7);
          this._rightHead.dir = 'left';
        }
      } else {
        this._rightHead.x -= 2;
        if (this._rightHead.x < 0) {
          this._rightHead.y = Math.min(this._rightHead.y + 1, 7);
          this._rightHead.dir = 'right';
          this._rightHead.x = 0;
        }
      }
    } else {
      // side === 'left'
      flipped = stone.leftPip === this._leftOpen!;
      // Update leftOpen
      this._leftOpen = flipped ? stone.rightPip : stone.leftPip;
      // Collision check
      const occupied = this._tiles.some(t => t.x === this._leftHead.x && t.y === this._leftHead.y);
      if (occupied) {
        this._maxCol += 4;
        this._leftHead.dir = 'left';
        this._leftHead.x = 0;
      }
      x = this._leftHead.x;
      y = this._leftHead.y;
      // Advance leftHead
      if (this._leftHead.dir === 'left') {
        this._leftHead.x -= 2;
        if (this._leftHead.x < 0) {
          this._leftHead.y = Math.min(this._leftHead.y + 1, 7);
          this._leftHead.dir = 'right';
          this._leftHead.x = 0;
        }
      } else {
        this._leftHead.x += 2;
        if (this._leftHead.x > this._maxCol) {
          this._leftHead.y = Math.min(this._leftHead.y + 1, 7);
          this._leftHead.dir = 'left';
          this._leftHead.x = this._maxCol;
        }
      }
    }

    const tile: BoardTile = {
      id: randomUUID(),
      stone,
      x,
      y,
      orientation: 'h',
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
    const placed: PlacedStone[] = tiles.map(tile => ({
      stone: tile.stone,
      side: 'right' as const,
      flipped: tile.side === 'right' ? tile.flipped : !tile.flipped,
    }));
    return Chain.fromPlacedStones(placed);
  }

  toJSON(): BoardJSON {
    return {
      tiles: this._tiles,
      orderedTiles: this._orderedTiles,
      leftOpen: this._leftOpen,
      rightOpen: this._rightOpen,
      rightHead: { ...this._rightHead },
      leftHead: { ...this._leftHead },
      maxCol: this._maxCol,
    };
  }

  static fromJSON(json: BoardJSON): Board {
    const b = new Board();
    b._tiles = json.tiles;
    b._orderedTiles = json.orderedTiles;
    b._leftOpen = json.leftOpen;
    b._rightOpen = json.rightOpen;
    b._rightHead = { ...json.rightHead };
    b._leftHead = { ...json.leftHead };
    b._maxCol = json.maxCol;
    b._firstPlaced = json.tiles.length > 0;
    return b;
  }
}
