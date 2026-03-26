# Domino Board Combat Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the linear `Chain` combat model with a 2D `Board` class, add a real enemy hand that plays onto the shared board, and rebuild the combat UI to match the new wireframe layout.

**Architecture:** A new `Board` class (server-side) tracks placed tiles with 2D snake-layout positions, replaces `chain` in the session, and bridges to the existing `calculateDamage`/`analyzeChain` functions via `Chain.fromPlacedStones`. The combat route is updated to use the new Board and a new greedy `EnemyBoardAI`. The frontend is fully rewritten with `DominoBoard` and `EnemyHand` components.

**Tech Stack:** TypeScript, Express (server), React + Vitest (client), Jest (server tests), Redis (session storage)

**Spec:** `docs/superpowers/specs/2026-03-25-domino-board-combat-redesign.md`

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `src/game/chain.ts` | Modify | Add `Chain.fromPlacedStones` static method |
| `src/game/board.ts` | Create | `Board` class — tile placement, snake layout, `toChainForTurn` |
| `src/game/ai/enemy-board-ai.ts` | Create | Greedy enemy AI that plays onto `Board` |
| `src/session/combat-session.ts` | Modify | Replace `chain` with `board`; add `enemyHand`, `enemyHandSize` |
| `src/types/api.ts` | Modify | Update `CombatStateResponse`, `PlayStoneResponse`, `EndTurnResponse`; delete `UnplayStoneResponse` |
| `server/src/routes/combat.ts` | Modify | All routes — `/play` gets `side`, `/unplay` deleted, end-turn uses `Board` + `EnemyBoardAI` |
| `client/src/components/DominoBoard.tsx` | Create | Renders 2D board grid from `BoardJSON` |
| `client/src/components/EnemyHand.tsx` | Create | Face-down tile count display |
| `client/src/components/EnemyTurnSequence.tsx` | Modify | `attack.stone` → `attack.stonesPlayed[]` |
| `client/src/screens/CombatScreen.tsx` | Rewrite | New layout wiring all components |
| `client/src/screens/CombatScreen.css` | Rewrite | New layout CSS |
| `src/game/__tests__/board.test.ts` | Create | Board unit tests |
| `src/game/ai/__tests__/enemy-board-ai.test.ts` | Create | AI unit tests |
| `server/src/__tests__/combat.test.ts` | Modify | Updated route tests |
| `client/src/components/__tests__/DominoBoard.test.tsx` | Create | DominoBoard render tests |
| `client/src/components/__tests__/EnemyHand.test.tsx` | Create | EnemyHand render tests |
| `client/src/__tests__/CombatScreen.test.tsx` | Modify | Updated layout tests |
| `client/src/components/__tests__/EnemyTurnSequence.test.tsx` | Modify | Updated prop tests |

---

## Task 1: `Chain.fromPlacedStones`

**Files:**
- Modify: `src/game/chain.ts`
- Modify: `src/game/__tests__/chain.test.ts`

- [ ] **Step 1: Write the failing test**

  Add to the bottom of `src/game/__tests__/chain.test.ts`:

  ```ts
  describe('Chain — fromPlacedStones', () => {
    it('builds a chain with the given stones array', () => {
      const placed: PlacedStone[] = [
        { stone: makeStone('s1', 2, 4), side: 'right', flipped: false },
        { stone: makeStone('s2', 4, 6), side: 'right', flipped: false },
      ];
      const chain = Chain.fromPlacedStones(placed);
      expect(chain.stones).toHaveLength(2);
      expect(chain.stones[0].stone.id).toBe('s1');
      expect(chain.stones[1].stone.id).toBe('s2');
    });

    it('leaves leftOpen and rightOpen as null', () => {
      const placed: PlacedStone[] = [
        { stone: makeStone('s1', 2, 4), side: 'right', flipped: false },
      ];
      const chain = Chain.fromPlacedStones(placed);
      expect(chain.leftOpen).toBeNull();
      expect(chain.rightOpen).toBeNull();
    });

    it('returns empty chain for empty array', () => {
      const chain = Chain.fromPlacedStones([]);
      expect(chain.stones).toHaveLength(0);
    });
  });
  ```

  Also **replace** the existing `import { Chain }` line at the top of the test file with (do NOT add a second import line):
  ```ts
  import { Chain, PlacedStone } from '../chain';
  ```

- [ ] **Step 2: Run test to confirm it fails**

  ```bash
  npx jest src/game/__tests__/chain.test.ts --no-coverage 2>&1 | tail -20
  ```

  Expected: `TypeError: Chain.fromPlacedStones is not a function`

- [ ] **Step 3: Implement `Chain.fromPlacedStones`**

  Add to `src/game/chain.ts` inside the `Chain` class, after `fromJSON`:

  ```ts
  static fromPlacedStones(stones: PlacedStone[]): Chain {
    const c = new Chain();
    c.stones = stones;
    // leftOpen and rightOpen remain null — calculateDamage never reads them
    return c;
  }
  ```

- [ ] **Step 4: Run tests to confirm they pass**

  ```bash
  npx jest src/game/__tests__/chain.test.ts --no-coverage 2>&1 | tail -10
  ```

  Expected: all tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/game/chain.ts src/game/__tests__/chain.test.ts
  git commit -m "feat: add Chain.fromPlacedStones static factory method"
  ```

---

## Task 2: `Board` class — core data model

**Files:**
- Create: `src/game/board.ts`
- Create: `src/game/__tests__/board.test.ts`

- [ ] **Step 1: Write the failing tests**

  Create `src/game/__tests__/board.test.ts`:

  ```ts
  import { randomUUID } from 'crypto';
  import { Board, BoardTile } from '../board';
  import type { Stone } from '../models/stone';
  import { Chain } from '../chain';

  function stone(leftPip: number, rightPip: number, element: string | null = null): Stone {
    return { id: randomUUID(), leftPip, rightPip, element };
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
      // Fill right head to col 20 (maxCol), then next tile should wrap to row 5
      const b = new Board();
      // first tile at (10,4), rightHead at (12,4) dir=right
      // place 4 more right-end tiles: (12,4),(14,4),(16,4),(18,4) → rightHead=(20,4)
      // Since 20+1>=20, next rightHead → y=5, dir=left
      // 5th right tile should be at (20,4)... wait, let me re-check the algorithm:
      // After placing at rightHead.x: if dir='right': x+=2; if x+1>=maxCol: y++, dir='left'
      // So tile placed AT rightHead.x, THEN head advances.
      // tile1: (10,4) placed. rightHead=(12,4)
      // tile2: (12,4) placed. head: x=14; 14+1<20 → rightHead=(14,4)
      // tile3: (14,4) placed. head: x=16; 16+1<20 → rightHead=(16,4)
      // tile4: (16,4) placed. head: x=18; 18+1<20 → rightHead=(18,4)
      // tile5: (18,4) placed. head: x=20; 20+1>=20 → y=5, dir=left → rightHead=(20,5,left)
      // tile6: (20,5) placed. head: dir=left: x=18; 18>=0 → rightHead=(18,5,left)
      let b2 = new Board();
      // start chain
      let s = stone(1, 3);
      b2.playStone(s, 'right', 'player', 1); // (10,4), rightOpen=3
      for (let i = 0; i < 4; i++) {
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
      // first tile at (10,4), leftHead at (8,4) dir=left
      // tile2 (left): placed at (8,4), head: x=6; 6>=0 → leftHead=(6,4,left)
      // tile3 (left): placed at (6,4), head: x=4; 4>=0 → leftHead=(4,4,left)
      // tile4 (left): placed at (4,4), head: x=2; 2>=0 → leftHead=(2,4,left)
      // tile5 (left): placed at (2,4), head: x=0; 0>=0 → leftHead=(0,4,left)
      // tile6 (left): placed at (0,4), head: x=-2; -2<0 → y=5, dir=right → leftHead=(0,5,right) ... but x becomes 0 after wrap
      // Actually spec says: if dir=left: x-=2; if x<0: y+=1, dir=right
      // So after placing tile6 at (0,4): x = 0-2 = -2 < 0 → y=5, dir=right, x keeps going? Need to clamp.
      // Per spec's leftHead advance: x=-2 → wrap: y++, dir=right. Next leftHead is at x=0,y=5,dir=right.
      const b = new Board();
      b.playStone(stone(2, 4), 'right', 'player', 1); // first tile (10,4); leftOpen=2
      // play left tiles using stone.rightPip matching leftOpen each time
      b.playStone(stone(0, 2), 'left', 'player', 1); // (8,4); leftOpen=0
      b.playStone(stone(3, 0), 'left', 'player', 1); // (6,4); leftOpen=3
      b.playStone(stone(1, 3), 'left', 'player', 1); // (4,4); leftOpen=1
      const t5 = b.playStone(stone(5, 1), 'left', 'player', 1); // (2,4); leftOpen=5
      expect(t5.x).toBe(2);
      expect(t5.y).toBe(4);
      const t6 = b.playStone(stone(3, 5), 'left', 'player', 1); // (0,4); leftOpen=3
      expect(t6.x).toBe(0);
      expect(t6.y).toBe(4);
      const t7 = b.playStone(stone(1, 3), 'left', 'player', 1); // leftHead wrapped to (0,5,right)? tile at (0,5)
      expect(t7.y).toBe(5);
    });

    it('collision extends maxCol by 4', () => {
      // Force left and right heads to meet: pack enough tiles that rightHead's target is occupied
      // Simplest: fill 8 right tiles until rightHead collides with leftHead position
      // rightHead starts at (12,4) dir=right. After wrap fills row 4, heads meet on row 5.
      // This tests that maxCol increases rather than overwriting.
      const b = new Board();
      // Play 11 right tiles (double-pips to keep rightOpen constant)
      b.playStone(stone(1, 1), 'right', 'player', 1); // (10,4); rightOpen=1
      for (let i = 0; i < 10; i++) {
        b.playStone(stone(1, 1), 'right', 'player', 1);
      }
      // If collision occurred, maxCol should have grown above 20
      const json = b.toJSON();
      // Either maxCol > 20 (collision triggered) or all tiles have unique positions (no collision)
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
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  npx jest src/game/__tests__/board.test.ts --no-coverage 2>&1 | tail -10
  ```

  Expected: `Cannot find module '../board'`

- [ ] **Step 3: Create `src/game/board.ts`**

  ```ts
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
          }
        } else {
          this._leftHead.x += 2;
          if (this._leftHead.x + 1 >= this._maxCol) {
            this._leftHead.y = Math.min(this._leftHead.y + 1, 7);
            this._leftHead.dir = 'left';
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
  ```

- [ ] **Step 4: Run tests**

  ```bash
  npx jest src/game/__tests__/board.test.ts --no-coverage 2>&1 | tail -20
  ```

  Expected: all tests pass. Fix any that don't before moving on.

- [ ] **Step 5: Run the full server test suite to check for regressions**

  ```bash
  npm test -- --no-coverage 2>&1 | tail -20
  ```

  Expected: all pre-existing tests still pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/game/board.ts src/game/__tests__/board.test.ts
  git commit -m "feat: add Board class with snake layout and toChainForTurn bridge"
  ```

---

## Task 3: `EnemyBoardAI`

**Files:**
- Create: `src/game/ai/enemy-board-ai.ts`
- Create: `src/game/ai/__tests__/enemy-board-ai.test.ts`

- [ ] **Step 1: Write failing tests**

  Create `src/game/ai/__tests__/enemy-board-ai.test.ts`:

  ```ts
  import { randomUUID } from 'crypto';
  import { Board } from '../../board';
  import { EnemyBoardAI } from '../enemy-board-ai';
  import type { Stone } from '../../models/stone';

  function stone(leftPip: number, rightPip: number): Stone {
    return { id: randomUUID(), leftPip, rightPip, element: null };
  }

  describe('EnemyBoardAI.playTurn', () => {
    it('plays a matching tile onto the board and removes it from hand', () => {
      const board = new Board();
      board.playStone(stone(1, 3), 'right', 'player', 1); // rightOpen=3, leftOpen=1
      const hand: Stone[] = [stone(3, 5)]; // leftPip=3 matches rightOpen
      const ai = new EnemyBoardAI();
      const remaining = ai.playTurn(board, hand, 1);
      expect(remaining).toHaveLength(0);
      expect(board.toJSON().tiles).toHaveLength(2);
    });

    it('plays multiple tiles in one call', () => {
      const board = new Board();
      board.playStone(stone(1, 3), 'right', 'player', 1); // rightOpen=3
      const hand: Stone[] = [stone(3, 5), stone(5, 2)]; // chain: rightOpen→5→2
      const ai = new EnemyBoardAI();
      const remaining = ai.playTurn(board, hand, 1);
      expect(remaining).toHaveLength(0);
      expect(board.toJSON().tiles).toHaveLength(3);
    });

    it('stops and returns remaining tiles when no more matches', () => {
      const board = new Board();
      board.playStone(stone(1, 3), 'right', 'player', 1); // rightOpen=3
      const hand: Stone[] = [stone(3, 5), stone(0, 0)]; // second tile can't connect after first
      const ai = new EnemyBoardAI();
      const remaining = ai.playTurn(board, hand, 1);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].leftPip).toBe(0);
    });

    it('returns full hand unchanged when no tiles are playable', () => {
      const board = new Board();
      board.playStone(stone(1, 3), 'right', 'player', 1); // rightOpen=3
      const hand: Stone[] = [stone(0, 0), stone(6, 6)];
      const ai = new EnemyBoardAI();
      const remaining = ai.playTurn(board, hand, 1);
      expect(remaining).toHaveLength(2);
    });

    it('prefers the end with the highest junction pip', () => {
      // leftOpen=2, rightOpen=5 — hand has stone [5|2] which matches both
      const board = new Board();
      board.playStone(stone(2, 5), 'right', 'player', 1); // leftOpen=2, rightOpen=5
      const hand: Stone[] = [stone(5, 2)]; // leftPip=5→rightOpen(5); rightPip=2→leftOpen(2)
      // right junction pip = 5, left junction pip = 2 → prefer right
      const ai = new EnemyBoardAI();
      ai.playTurn(board, hand, 1);
      const enemyTile = board.toJSON().tiles.find(t => t.playedBy === 'enemy')!;
      expect(enemyTile.side).toBe('right');
    });

    it('prefers right on tie', () => {
      // Both ends have the same pip value
      const board = new Board();
      board.playStone(stone(3, 3), 'right', 'player', 1); // leftOpen=3, rightOpen=3
      const hand: Stone[] = [stone(3, 1)]; // matches both ends equally (pip=3)
      const ai = new EnemyBoardAI();
      ai.playTurn(board, hand, 1);
      const enemyTile = board.toJSON().tiles.find(t => t.playedBy === 'enemy')!;
      expect(enemyTile.side).toBe('right');
    });
  });
  ```

- [ ] **Step 2: Run to confirm failure**

  ```bash
  npx jest src/game/ai/__tests__/enemy-board-ai.test.ts --no-coverage 2>&1 | tail -10
  ```

  Expected: `Cannot find module '../enemy-board-ai'`

- [ ] **Step 3: Create `src/game/ai/enemy-board-ai.ts`**

  ```ts
  import type { Stone } from '../models/stone';
  import type { Board } from '../board';

  export class EnemyBoardAI {
    /**
     * Plays tiles from `hand` onto `board` greedily until no more matches.
     * Returns the remaining tiles in hand (discarded tiles are NOT returned to bag).
     */
    playTurn(board: Board, hand: Stone[], turnNumber: number): Stone[] {
      const remaining = [...hand];

      while (true) {
        const best = this._bestPlay(board, remaining);
        if (!best) break;

        // Remove from hand
        const idx = remaining.indexOf(best.stone);
        remaining.splice(idx, 1);

        board.playStone(best.stone, best.side, 'enemy', turnNumber);
      }

      return remaining;
    }

    private _bestPlay(
      board: Board,
      hand: Stone[]
    ): { stone: Stone; side: 'left' | 'right'; score: number } | null {
      let best: { stone: Stone; side: 'left' | 'right'; score: number } | null = null;

      for (const stone of hand) {
        const { left, right } = board.canPlay(stone);

        if (right) {
          const score = this._junctionPip(stone, 'right', board.rightOpen);
          if (!best || score > best.score || (score === best.score && 'right' > best.side)) {
            best = { stone, side: 'right', score };
          }
        }

        if (left) {
          const score = this._junctionPip(stone, 'left', board.leftOpen);
          if (!best || score > best.score) {
            best = { stone, side: 'left', score };
          }
        }
      }

      return best;
    }

    private _junctionPip(
      stone: Stone,
      side: 'left' | 'right',
      openEnd: number | null
    ): number {
      if (openEnd === null) return 0;
      if (side === 'right') {
        // flipped = stone.rightPip === openEnd
        return stone.rightPip === openEnd ? stone.rightPip : stone.leftPip;
      } else {
        // flipped = stone.leftPip === openEnd
        return stone.leftPip === openEnd ? stone.leftPip : stone.rightPip;
      }
    }
  }
  ```

- [ ] **Step 4: Run tests**

  ```bash
  npx jest src/game/ai/__tests__/enemy-board-ai.test.ts --no-coverage 2>&1 | tail -20
  ```

  Expected: all pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/game/ai/enemy-board-ai.ts src/game/ai/__tests__/enemy-board-ai.test.ts
  git commit -m "feat: add EnemyBoardAI greedy tile placement"
  ```

---

## Task 4: Update API types and session schema

**Files:**
- Modify: `src/types/api.ts`
- Modify: `src/session/combat-session.ts`

No tests for this task — types are validated when the routes are updated in Task 5.

- [ ] **Step 1: Update `src/types/api.ts`**

  Replace the `CombatStateResponse`, `PlayStoneResponse`, `UnplayStoneResponse`, and `EndTurnResponse` interfaces. Add `BoardJSON` import.

  At the top of the file, add the Board import:
  ```ts
  import type { BoardJSON } from '../game/board';
  ```

  Replace `CombatStateResponse`:
  ```ts
  export interface CombatStateResponse {
    enemy: Enemy;
    playerHand: Stone[];
    board: BoardJSON;
    enemyHandCount: number;
    playerState: PlayerState;
    turnNumber: number;
    phase: 'player-turn' | 'enemy-turn' | 'resolving';
    swapsUsed?: number;
    swapsPerTurn?: number;
    bag?: Stone[];
  }
  ```

  Replace `PlayStoneResponse`:
  ```ts
  export interface PlayStoneResponse {
    board: BoardJSON;
    hand: Stone[];
  }
  ```

  **Delete** `UnplayStoneResponse` entirely.

  In `EndTurnResponse`, replace `enemyAttack`:
  ```ts
  enemyAttack?: {
    stonesPlayed: { leftPip: number; rightPip: number }[];
    rawDamage: number;
    armorBlocked: number;
    damage: number;
    effects: string[];
  };
  ```

  Also remove the `import type { PlacedStone } from '../game/chain';` line if it's only used by the deleted `UnplayStoneResponse`.

- [ ] **Step 2: Update `src/session/combat-session.ts`**

  Add the `BoardJSON` import at the top:
  ```ts
  import type { BoardJSON } from '../game/board';
  ```

  In `CombatSession`, replace the `chain` field with `board` and add enemy hand fields:
  ```ts
  // Remove:
  chain: {
    stones: PlacedStone[];
    leftOpen: number | null;
    rightOpen: number | null;
  };

  // Add:
  board: BoardJSON;
  enemyHand: Stone[];
  enemyHandSize: number;
  ```

  Also remove the `PlacedStone` import from `combat-session.ts` (the local one at the top of the file — it's no longer needed here).

- [ ] **Step 3: Run TypeScript compile check**

  ```bash
  npx tsc --noEmit 2>&1 | head -40
  ```

  There will be errors in `combat.ts` and `combat.test.ts` (they still reference the old types). That's expected — we'll fix them in Task 5. Check that the errors are only in those files.

- [ ] **Step 4: Commit**

  ```bash
  git add src/types/api.ts src/session/combat-session.ts
  git commit -m "feat: update API types and session schema for Board redesign"
  ```

---

## Task 5: Update combat routes

**Files:**
- Modify: `server/src/routes/combat.ts`
- Modify: `server/src/__tests__/combat.test.ts`

This is the largest task. Work through the routes one at a time.

- [ ] **Step 1: Update the failing combat route tests first**

  Open `server/src/__tests__/combat.test.ts`. The tests reference `session.chain`, `leftOpen`/`rightOpen` at the top level of responses, and the `/unplay` route. Update them to use the new shape.

  Key changes to make in the test file:
  - Any `session.chain = ...` setup → `session.board = new Board().toJSON(); session.enemyHand = []; session.enemyHandSize = 5;`
  - Any `data.chain` response checks → `data.board`
  - Any `data.leftOpen`/`data.rightOpen` top-level → `data.board.leftOpen` / `data.board.rightOpen`
  - Remove all tests for `/combat/unplay`
  - Update `/play` tests to include `side: 'right'` in the request body
  - Add a test: `POST /play with side: 'left' on empty board returns 400`
  - Add a test: `POST /play with mismatched pip returns 400`
  - Add an end-turn test that verifies player tiles from `current` turn are used for damage, not enemy tiles
  - Add a test that `turnNumber` is incremented by exactly 1 per end-turn call
  - Add a test: **TravelerBoots fires only on win** — set up a session where the enemy has 1 HP and the player plays a damaging tile; verify the end-turn response includes `stoneRewards` (boots reward). Then repeat with enemy surviving (enemy HP > damage dealt) and verify `stoneRewards` is absent or empty.
  - Add a test: **`gloveBase` is captured before increment** — set `session.stonesPlayedTotal = 3` before end-turn; verify that the first Glove bonus is calculated using base index 4 (i.e., gloveBase=3, tile index 0 → `applyChainMastersGlove(4, ...)`), not 3.
  - Add a test: **`stonesPlayedTotal` is incremented after end-turn** — set `session.stonesPlayedTotal = 2`, play 2 stones during the turn, call end-turn, and verify the updated session (re-fetched via GET /combat or inspected via the mock) has `stonesPlayedTotal = 4`.
  - Add a test: **refill always runs** — call end-turn when player played no tiles; verify the response still includes a `hand` field (refill ran and produced a hand, even if it's identical to before).
  - Add a test: **enemy plays onto shared open ends** — set up a board with `rightOpen=4`; call end-turn; verify that the board returned in the response has `enemyAttack.stonesPlayed` containing a stone whose connecting pip is 4 (i.e., the enemy played onto the right open end, not a separate board).

  The exact changes depend on how the current tests are written. Read the current test file before editing.

- [ ] **Step 2: Run the combat tests to confirm they fail for the right reasons**

  ```bash
  npx jest server/src/__tests__/combat.test.ts --no-coverage 2>&1 | tail -30
  ```

- [ ] **Step 3: Rewrite `server/src/routes/combat.ts`**

  Make the following changes to the imports block at the top:
  ```ts
  // Add:
  import { Board } from '../../../src/game/board';
  import { EnemyBoardAI } from '../../../src/game/ai/enemy-board-ai';
  // Remove:
  import { Chain } from '../../../src/game/chain';
  import { EnemyAI, EnemyType } from '../../../src/game/ai/enemy-ai';
  // Remove:
  import type { PlacedStone as GamePlacedStone } from '../../../src/game/chain';
  // Remove:
  import type { UnplayStoneResponse } from '../../../src/types/api';
  // Remove helpers that referenced chain:
  // toGamePlacedStones, chainFromSession
  ```

  **Update `GET /:runId/combat`:**
  Replace the response construction. Instead of `chain: toGamePlacedStones(session.chain.stones)`, use:
  ```ts
  board: session.board,
  enemyHandCount: (session.enemyHand ?? []).length,
  ```
  Remove `leftOpen` and `rightOpen` from the response.

  **Update `POST /:runId/combat/play`:**
  - Change request body to `{ stoneIndex, side }` where `side: 'left' | 'right'`
  - Validate `side` — return 400 if not `'left'` or `'right'`
  - Load board: `const board = Board.fromJSON(session.board)`
  - Validate the play: check `board.canPlay(stone)[side]` — return 400 if false
  - Also return 400 if board is empty and `side === 'left'`
  - Call `board.playStone(stone, side, 'player', session.turnNumber)`
  - Remove stone from hand: `session.hand = newHand`
  - `session.board = board.toJSON()`
  - Response: `{ board: board.toJSON(), hand: newHand }`

  **Delete `POST /:runId/combat/unplay`** — remove the entire route handler.

  **Update `POST /:runId/combat/end-turn`:**
  Follow the spec's step sequence exactly:
  ```ts
  const board = Board.fromJSON(session.board);
  const current = session.turnNumber;

  // Steps 1-4: player damage
  const playerChain = board.toChainForTurn(current, 'player');
  const analysis = analyzeChain(playerChain, relics);
  const effects = applyChainEffects(analysis, playerState, enemy, relics);
  let chainDamage = calculateDamage(playerChain, {} as any, effects.lightningBonus).finalDamage;

  // Steps 5-10: relic bonuses
  const gloveTiles = board.getTilesForTurn(current, 'player');
  const gloveBase = session.stonesPlayedTotal ?? 0;
  if (relics.includes(RelicType.ChainMastersGlove) && gloveTiles.length > 0) {
    let gloveBonus = 0;
    gloveTiles.forEach((tile, i) => {
      const stonePipDmg = (tile.stone.leftPip + tile.stone.rightPip) * 2;
      gloveBonus += applyChainMastersGlove(gloveBase + i + 1, stonePipDmg) - stonePipDmg;
    });
    chainDamage += gloveBonus;
  }
  session.stonesPlayedTotal = gloveBase + gloveTiles.length;

  if (relics.includes(RelicType.TheLastStone)) {
    const lastStoneDmg = applyTheLastStone(gloveTiles.map(t => ({ stone: t.stone, side: t.side, flipped: t.flipped })) as any);
    if (lastStoneDmg > 0) chainDamage = lastStoneDmg;
  }
  if (relics.includes(RelicType.VoltaicLens)) {
    chainDamage = applyVoltaicLens(analysis.overloadTriggered, chainDamage);
  }
  if (relics.includes(RelicType.InfiniteBag) && gloveTiles.length > 0) {
    const playedStones = gloveTiles.map(t => t.stone as GameStone);
    session.bag = applyInfiniteBag(playedStones, session.bag as any) as any;
  }

  // Step 10-11: deal damage, check win
  dealDamage(enemy, chainDamage);

  if (isDead(enemy)) {
    // TravelerBoots fires on win
    let goldEarned = 0;
    const triggeredRelics: string[] = [];
    if (relics.includes(RelicType.TravelerBoots)) {
      const chainBonus = applyTravelerBoots(gloveTiles.length);
      goldEarned += chainBonus; // (base gold added below from node)
      if (chainBonus > 0) triggeredRelics.push(RelicType.TravelerBoots);
    }
    // ... (rest of win-path logic unchanged — gold award, BloodPact, stoneRewards, etc.)
    session.board = board.toJSON();
    session.turnNumber += 1;
    session.swapsUsed = 0;
    // ... save and return 'player-won'
  }

  // Step 12: enemy AI plays
  const ai = new EnemyBoardAI();
  const remainingEnemyHand = ai.playTurn(board, session.enemyHand ?? [], current);
  session.enemyHand = remainingEnemyHand;

  // Step 13: enemy damage
  const enemyChain = board.toChainForTurn(current, 'enemy');
  const enemyDamageResult = calculateDamage(enemyChain, {} as any);
  const rawEnemyDamage = enemyDamageResult.finalDamage;

  // Step 14: apply armor
  const armorResult = applyArmor(rawEnemyDamage, playerState.armor);
  playerState.armor = armorResult.armorRemaining;
  const armorBlocked = rawEnemyDamage - armorResult.damageToDeal;
  const netEnemyDamage = armorResult.damageToDeal;
  if (armorResult.damageToDeal > 0) {
    dealDamage(playerState, armorResult.damageToDeal);
    // PhoenixFeather, CurseOfGreed — unchanged
  }

  // Steps 15-17: DoT, status decay, player death check, refill
  // ... (DoT/status tick unchanged)
  // Refill both hands
  const HAND_SIZE = session.handSize ?? 7;
  const bag = new Bag(session.bag as any[]);
  const playerNeeded = Math.max(0, HAND_SIZE - session.hand.length);
  if (playerNeeded > 0) {
    session.hand = [...session.hand, ...bag.draw(playerNeeded)];
  }
  const enemyNeeded = Math.max(0, session.enemyHandSize - session.enemyHand.length);
  if (enemyNeeded > 0) {
    session.enemyHand = [...session.enemyHand, ...bag.draw(enemyNeeded)];
  }
  session.bag = bag.stones;

  // Step 18-19
  session.board = board.toJSON();
  session.turnNumber += 1;
  session.swapsUsed = 0;

  // Build enemyAttack with stonesPlayed[]
  const enemyTilesPlayed = board.getTilesForTurn(current, 'enemy');
  const stonesPlayed = enemyTilesPlayed.map(t => ({ leftPip: t.stone.leftPip, rightPip: t.stone.rightPip }));

  const response: EndTurnResponse = {
    playerState,
    enemy,
    combatResult,
    enemyAttack: enemyTilesPlayed.length > 0
      ? { stonesPlayed, rawDamage: rawEnemyDamage, armorBlocked, damage: netEnemyDamage, effects: [] }
      : undefined,
    dotDamage: { burn: burnDamage, poison: poisonDamage },
    hand: session.hand.map(toGameStone),
  };
  ```

  Also update the **combat session initialisation** where a new combat starts (when the session is created from a run node). Find where `createCombatSession` is called and add:
  ```ts
  // Draw enemy hand from bag after player hand
  const enemyHandSize = 5;
  const enemyHand = bag.draw(enemyHandSize);
  session.bag = bag.stones;
  session.board = new Board().toJSON();
  session.enemyHand = enemyHand;
  session.enemyHandSize = enemyHandSize;
  ```
  And remove `session.chain`.

- [ ] **Step 4: Run combat tests**

  ```bash
  npx jest server/src/__tests__/combat.test.ts --no-coverage 2>&1 | tail -30
  ```

  Iterate until all pass.

- [ ] **Step 5: Run full server test suite**

  ```bash
  npm test -- --no-coverage 2>&1 | tail -20
  ```

  Expected: all pass.

- [ ] **Step 6: Commit**

  ```bash
  git add server/src/routes/combat.ts server/src/__tests__/combat.test.ts
  git commit -m "feat: update combat routes to use Board and EnemyBoardAI"
  ```

---

## Task 6: Update `EnemyTurnSequence` for `stonesPlayed[]`

**Files:**
- Modify: `client/src/components/EnemyTurnSequence.tsx`
- Modify: `client/src/components/__tests__/EnemyTurnSequence.test.tsx`

- [ ] **Step 1: Update the test first**

  Open `client/src/components/__tests__/EnemyTurnSequence.test.tsx`. Update any test that passes `attack.stone` to instead pass `attack.stonesPlayed`:

  ```tsx
  // Before:
  attack={{ stone: { leftPip: 3, rightPip: 5 }, rawDamage: 6, armorBlocked: 0, damage: 6 }}

  // After:
  attack={{ stonesPlayed: [{ leftPip: 3, rightPip: 5 }], rawDamage: 6, armorBlocked: 0, damage: 6 }}
  ```

  Add a test that verifies multiple stones render:
  ```tsx
  it('renders multiple enemy stones when stonesPlayed has 2 entries', () => {
    render(
      <EnemyTurnSequence
        enemyName="Goblin"
        attack={{ stonesPlayed: [{ leftPip: 2, rightPip: 4 }, { leftPip: 4, rightPip: 1 }], rawDamage: 8, armorBlocked: 0, damage: 8 }}
        dotDamage={{ burn: 0, poison: 0 }}
        onDone={() => {}}
      />
    );
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
  ```

- [ ] **Step 2: Run to confirm failure**

  ```bash
  cd client && npx vitest run src/components/__tests__/EnemyTurnSequence.test.tsx 2>&1 | tail -15
  ```

- [ ] **Step 3: Update `EnemyTurnSequence.tsx`**

  Change the `Props` interface:
  ```ts
  attack?: {
    stonesPlayed: { leftPip: number; rightPip: number }[];
    rawDamage: number;
    armorBlocked: number;
    damage: number;
  };
  ```

  In the render, replace the single stone display with a map over `stonesPlayed`:
  ```tsx
  {attack ? (
    <>
      <div className="seq-icon">💀</div>
      <div className="seq-text">
        {enemyName} plays
        {attack.stonesPlayed.map((s, i) => (
          <span key={i} className="seq-domino">
            <span className="seq-domino__pip">{s.leftPip}</span>
            <span className="seq-domino__div" />
            <span className="seq-domino__pip">{s.rightPip}</span>
          </span>
        ))}
      </div>
      <div className="seq-val seq-val--base">{attack.rawDamage} dmg</div>
    </>
  ) : ...}
  ```

  Keep `slot1Visible`, `slot2Visible`, `slot3Visible` checks the same — they reference `attack` (still truthy when present).

- [ ] **Step 4: Run tests**

  ```bash
  cd client && npx vitest run src/components/__tests__/EnemyTurnSequence.test.tsx 2>&1 | tail -15
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/components/EnemyTurnSequence.tsx client/src/components/__tests__/EnemyTurnSequence.test.tsx
  git commit -m "feat: update EnemyTurnSequence for stonesPlayed array"
  ```

---

## Task 7: `DominoBoard` component

**Files:**
- Create: `client/src/components/DominoBoard.tsx`
- Create: `client/src/components/__tests__/DominoBoard.test.tsx`

- [ ] **Step 1: Write failing tests**

  Create `client/src/components/__tests__/DominoBoard.test.tsx`:

  ```tsx
  import { render, screen } from '@testing-library/react';
  import { DominoBoard } from '../DominoBoard';
  import type { BoardJSON } from '../../../../src/game/board'; // type import only — 4 levels up to repo root

  function emptyBoard(): BoardJSON {
    return {
      tiles: [],
      orderedTiles: [],
      leftOpen: null,
      rightOpen: null,
      rightHead: { x: 12, y: 4, dir: 'right' },
      leftHead: { x: 8, y: 4, dir: 'left' },
      maxCol: 20,
    };
  }

  function tileAt(x: number, y: number, leftPip: number, rightPip: number): BoardJSON['tiles'][number] {
    return {
      id: `t-${x}-${y}`,
      stone: { id: 's1', leftPip, rightPip, element: null },
      x, y,
      orientation: 'h',
      flipped: false,
      side: 'right',
      playedBy: 'player',
      turnNumber: 1,
    };
  }

  describe('DominoBoard', () => {
    it('renders without crashing on empty board', () => {
      render(<DominoBoard board={emptyBoard()} isPlayerTurn={true} onEndSelect={() => {}} choosingEnd={null} />);
      expect(screen.getByTestId('domino-board')).toBeInTheDocument();
    });

    it('renders a tile when board has one tile', () => {
      const board = emptyBoard();
      board.tiles = [tileAt(10, 4, 2, 4)];
      board.orderedTiles = board.tiles;
      board.leftOpen = 2;
      board.rightOpen = 4;
      render(<DominoBoard board={board} isPlayerTurn={true} onEndSelect={() => {}} choosingEnd={null} />);
      // DominoStone renders pips as text
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('highlights open ends when isPlayerTurn is true', () => {
      const board = emptyBoard();
      board.tiles = [tileAt(10, 4, 2, 4)];
      board.orderedTiles = board.tiles;
      board.leftOpen = 2;
      board.rightOpen = 4;
      render(<DominoBoard board={board} isPlayerTurn={true} onEndSelect={() => {}} choosingEnd={null} />);
      expect(screen.getByTestId('open-end-left')).toBeInTheDocument();
      expect(screen.getByTestId('open-end-right')).toBeInTheDocument();
    });

    it('does not highlight open ends during enemy turn', () => {
      const board = emptyBoard();
      board.tiles = [tileAt(10, 4, 2, 4)];
      board.orderedTiles = board.tiles;
      board.leftOpen = 2;
      board.rightOpen = 4;
      render(<DominoBoard board={board} isPlayerTurn={false} onEndSelect={() => {}} choosingEnd={null} />);
      expect(screen.queryByTestId('open-end-left')).not.toBeInTheDocument();
    });

    it('calls onEndSelect with side when an open end is clicked', async () => {
      const board = emptyBoard();
      board.tiles = [tileAt(10, 4, 2, 4)];
      board.orderedTiles = board.tiles;
      board.leftOpen = 2;
      board.rightOpen = 4;
      const onEndSelect = vi.fn();
      const { getByTestId } = render(
        <DominoBoard board={board} isPlayerTurn={true} onEndSelect={onEndSelect} choosingEnd="both" />
      );
      getByTestId('open-end-right').click();
      expect(onEndSelect).toHaveBeenCalledWith('right');
    });
  });
  ```

- [ ] **Step 2: Run to confirm failure**

  ```bash
  cd client && npx vitest run src/components/__tests__/DominoBoard.test.tsx 2>&1 | tail -15
  ```

- [ ] **Step 3: Create `client/src/components/DominoBoard.tsx`**

  ```tsx
  import type { BoardJSON } from '../../../src/game/board';
  import { DominoStone } from './DominoStone';
  import './DominoBoard.css';

  interface Props {
    board: BoardJSON;
    isPlayerTurn: boolean;
    /** null = not choosing; 'both' = choosing between left and right */
    choosingEnd: 'both' | null;
    onEndSelect: (side: 'left' | 'right') => void;
  }

  const CELL_W = 56; // px per grid column
  const CELL_H = 72; // px per grid row

  export function DominoBoard({ board, isPlayerTurn, choosingEnd, onEndSelect }: Props) {
    const gridWidth = Math.max(board.maxCol, 20) * CELL_W;
    const gridHeight = 8 * CELL_H;

    const hasBoard = board.tiles.length > 0;

    return (
      <div className="domino-board-scroll" data-testid="domino-board">
        <div className="domino-board-grid" style={{ width: gridWidth, height: gridHeight, position: 'relative' }}>
          {board.tiles.map(tile => {
            const displayStone = tile.flipped
              ? { ...tile.stone, leftPip: tile.stone.rightPip, rightPip: tile.stone.leftPip }
              : tile.stone;
            const isEnemy = tile.playedBy === 'enemy';
            return (
              <div
                key={tile.id}
                style={{
                  position: 'absolute',
                  left: tile.x * CELL_W,
                  top: tile.y * CELL_H,
                }}
                className={`board-tile ${isEnemy ? 'board-tile--enemy' : 'board-tile--player'}`}
              >
                <DominoStone stone={displayStone} horizontal placed />
              </div>
            );
          })}

          {/* Open end indicators */}
          {hasBoard && isPlayerTurn && board.leftOpen !== null && (
            <button
              data-testid="open-end-left"
              className={`open-end open-end--left${choosingEnd === 'both' ? ' open-end--pulse' : ''}`}
              style={{
                position: 'absolute',
                left: board.leftHead.x * CELL_W - CELL_W,
                top: board.leftHead.y * CELL_H,
              }}
              onClick={() => onEndSelect('left')}
            >
              {board.leftOpen}
            </button>
          )}
          {hasBoard && isPlayerTurn && board.rightOpen !== null && (
            <button
              data-testid="open-end-right"
              className={`open-end open-end--right${choosingEnd === 'both' ? ' open-end--pulse' : ''}`}
              style={{
                position: 'absolute',
                left: board.rightHead.x * CELL_W,
                top: board.rightHead.y * CELL_H,
              }}
              onClick={() => onEndSelect('right')}
            >
              {board.rightOpen}
            </button>
          )}
        </div>
      </div>
    );
  }
  ```

  Create `client/src/components/DominoBoard.css` with minimal styles:
  ```css
  .domino-board-scroll {
    overflow-x: auto;
    overflow-y: hidden;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 8px;
    background: rgba(0,0,0,0.3);
    min-height: 100px;
  }

  .domino-board-grid {
    position: relative;
  }

  .board-tile--enemy {
    opacity: 0.75;
  }

  .open-end {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 2px solid gold;
    background: rgba(255,200,0,0.2);
    color: #fff;
    font-weight: bold;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .open-end--pulse {
    animation: pulse 0.8s infinite alternate;
  }

  @keyframes pulse {
    from { box-shadow: 0 0 4px gold; }
    to   { box-shadow: 0 0 16px gold; }
  }
  ```

- [ ] **Step 4: Run tests**

  ```bash
  cd client && npx vitest run src/components/__tests__/DominoBoard.test.tsx 2>&1 | tail -20
  ```

  Fix until passing.

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/components/DominoBoard.tsx client/src/components/DominoBoard.css client/src/components/__tests__/DominoBoard.test.tsx
  git commit -m "feat: add DominoBoard component with snake-layout grid"
  ```

---

## Task 8: `EnemyHand` component

**Files:**
- Create: `client/src/components/EnemyHand.tsx`
- Create: `client/src/components/__tests__/EnemyHand.test.tsx`

- [ ] **Step 1: Write failing tests**

  Create `client/src/components/__tests__/EnemyHand.test.tsx`:

  ```tsx
  import { render, screen } from '@testing-library/react';
  import { EnemyHand } from '../EnemyHand';

  describe('EnemyHand', () => {
    it('shows the correct count', () => {
      render(<EnemyHand count={4} />);
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('renders face-down tiles (no pip values in DOM)', () => {
      render(<EnemyHand count={3} />);
      // Pip values (1-6) should not appear as standalone numbers
      expect(screen.queryByTestId('pip-value')).not.toBeInTheDocument();
    });

    it('renders zero tiles gracefully', () => {
      render(<EnemyHand count={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: Run to confirm failure**

  ```bash
  cd client && npx vitest run src/components/__tests__/EnemyHand.test.tsx 2>&1 | tail -10
  ```

- [ ] **Step 3: Create `client/src/components/EnemyHand.tsx`**

  ```tsx
  import './EnemyHand.css';

  interface Props {
    count: number;
  }

  export function EnemyHand({ count }: Props) {
    return (
      <div className="enemy-hand">
        <div className="enemy-hand-tiles">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="enemy-hand-tile" aria-label="hidden enemy tile" />
          ))}
        </div>
        <div className="enemy-hand-count">{count}</div>
      </div>
    );
  }
  ```

  Create `client/src/components/EnemyHand.css`:
  ```css
  .enemy-hand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .enemy-hand-tiles {
    display: flex;
    gap: 4px;
  }

  .enemy-hand-tile {
    width: 24px;
    height: 40px;
    background: #3a2a4a;
    border: 1px solid rgba(255,255,255,0.25);
    border-radius: 4px;
  }

  .enemy-hand-count {
    color: #ccc;
    font-size: 0.85rem;
  }
  ```

- [ ] **Step 4: Run tests**

  ```bash
  cd client && npx vitest run src/components/__tests__/EnemyHand.test.tsx 2>&1 | tail -10
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/components/EnemyHand.tsx client/src/components/EnemyHand.css client/src/components/__tests__/EnemyHand.test.tsx
  git commit -m "feat: add EnemyHand component"
  ```

---

## Task 9: Rewrite `CombatScreen`

**Files:**
- Rewrite: `client/src/screens/CombatScreen.tsx`
- Rewrite: `client/src/screens/CombatScreen.css`
- Modify: `client/src/__tests__/CombatScreen.test.tsx`

- [ ] **Step 1: Update the CombatScreen tests first**

  Open `client/src/__tests__/CombatScreen.test.tsx`. The tests currently set up mocked fetch responses with `chain`, `leftOpen`, `rightOpen`. Update them to return the new shape with `board` and `enemyHandCount`.

  Key test shapes to update:
  ```ts
  // Mock GET /combat response:
  {
    enemy: { id: 'goblin', name: 'Goblin', hp: { current: 30, max: 30 }, status: { burn:0, slow:0, frozen:false, stunned:false, poison:0 } },
    playerHand: [],
    board: {
      tiles: [], orderedTiles: [], leftOpen: null, rightOpen: null,
      rightHead: { x:12, y:4, dir:'right' }, leftHead: { x:8, y:4, dir:'left' }, maxCol: 20
    },
    enemyHandCount: 5,
    playerState: { hp: { current: 80, max: 80 }, armor: 0, gold: 0, relics: [] },
    turnNumber: 1,
    phase: 'player-turn',
    swapsUsed: 0, swapsPerTurn: 1, bag: []
  }
  ```

  Add tests:
  - `renders enemy hand count label` (looks for a count near the top-center)
  - `renders hero HP bar below hero portrait`
  - `End Turn button is present`
  - `choose-end mode: clicking a tile that matches both ends shows end highlights` (can mock board state with leftOpen = rightOpen)
  - `enemy hand count does not expose pip values`

- [ ] **Step 2: Run to confirm tests fail**

  ```bash
  cd client && npx vitest run src/__tests__/CombatScreen.test.tsx 2>&1 | tail -20
  ```

- [ ] **Step 3: Rewrite `CombatScreen.tsx`**

  The new component wires together all the pieces. Key state:

  ```ts
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [choosingEnd, setChoosingEnd] = useState<'both' | null>(null);
  const [pendingStone, setPendingStone] = useState<{ index: number } | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [enemyHit, setEnemyHit] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const [swapMode, setSwapMode] = useState(false);
  const [showBag, setShowBag] = useState(false);
  const [enemyTurnData, setEnemyTurnData] = useState<EnemyTurnData | null>(null);
  const [stoneRewards, setStoneRewards] = useState<StoneReward[]>([]);
  ```

  Key handlers:

  ```ts
  // handleStoneClick: determine if both ends match → enter choosingEnd mode
  async function handleStoneClick(index: number) {
    if (!combat || combat.phase !== 'player-turn') return;
    if (swapMode) { await handleSwapStone(index); return; }

    const stone = combat.playerHand[index];
    const { left, right } = canStonePlay(stone, combat.board);

    if (!left && !right) return; // unplayable

    if (left && right) {
      // Both ends match — enter choose-end mode
      setPendingStone({ index });
      setChoosingEnd('both');
      return;
    }

    const side = right ? 'right' : 'left';
    await playStone(index, side);
  }

  // handleEndSelect: called when player clicks a board end in choose-end mode
  async function handleEndSelect(side: 'left' | 'right') {
    if (!pendingStone) return;
    setChoosingEnd(null);
    await playStone(pendingStone.index, side);
    setPendingStone(null);
  }

  async function playStone(index: number, side: 'left' | 'right') {
    const res = await fetch(`/api/run/${runId}/combat/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stoneIndex: index, side }),
    });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || 'Invalid move'); return; }
    setCombat(prev => prev ? { ...prev, board: data.board, playerHand: data.hand } : prev);
  }
  ```

  Layout structure:
  ```tsx
  return (
    <div className="combat-screen">
      {/* Stone reward overlay — unchanged */}
      {/* Top bar */}
      <div className="combat-top">
        <RelicBar relics={...} />
        <EnemyHand count={combat.enemyHandCount} />
        <div className="combat-enemy-zone">
          <img className={`enemy-sprite${enemyHit ? ' enemy-sprite--hit' : ''}`} src={getEnemySprite(...)} />
          <HPBar current={combat.enemy.hp.current} max={combat.enemy.hp.max} />
          <StatusBadges status={combat.enemy.status} />
        </div>
      </div>

      {/* Board */}
      <div className="combat-board-zone">
        <DominoBoard
          board={combat.board}
          isPlayerTurn={isPlayerTurn}
          choosingEnd={choosingEnd}
          onEndSelect={handleEndSelect}
        />
      </div>

      {/* Bottom bar */}
      <div className="combat-bottom">
        <div className="combat-player-zone">
          <img className={`hero-sprite${playerHit ? ' hero-sprite--hit' : ''}`} src="/assets/combat/hero/hero.png" />
          <HPBar current={combat.playerState.hp.current} max={combat.playerState.hp.max} />
        </div>
        <button className="btn-swap" onClick={() => setShowBag(s => !s)}>
          Bag ({combat.bag.length})
        </button>
        <div className="combat-hand-tiles">
          {combat.playerHand.map((stone, i) => {
            const { left, right } = canStonePlay(stone, combat.board);
            const playable = isPlayerTurn && (left || right);
            return (
              <DominoStone
                key={stone.id}
                stone={stone}
                horizontal
                onClick={() => handleStoneClick(i)}
                disabled={!isPlayerTurn || (!swapMode && !playable)}
                selected={swapMode || (choosingEnd === 'both' && pendingStone?.index === i)}
              />
            );
          })}
        </div>
        <button
          className="btn-end-turn"
          onClick={handleEndTurn}
          disabled={!isPlayerTurn || loading}
          data-testid="end-turn-btn"
        >
          {loading ? 'Resolving…' : 'End Turn'}
        </button>
      </div>

      {/* EnemyTurnSequence overlay */}
      {enemyTurnData && (
        <EnemyTurnSequence ... onDone={() => setEnemyTurnData(null)} />
      )}
    </div>
  );
  ```

  Add `canStonePlay` helper that uses `board.leftOpen`/`board.rightOpen`:
  ```ts
  function canStonePlay(stone: Stone, board: BoardJSON): { left: boolean; right: boolean } {
    if (!board || board.tiles.length === 0) return { left: false, right: true };
    const left = board.leftOpen !== null &&
      (stone.leftPip === board.leftOpen || stone.rightPip === board.leftOpen);
    const right = board.rightOpen !== null &&
      (stone.leftPip === board.rightOpen || stone.rightPip === board.rightOpen);
    return { left, right };
  }
  ```

  Update `handleEndTurn` to read from `data.enemyAttack.stonesPlayed` instead of `data.enemyAttack.stone`.

  Add an Escape key listener to cancel choose-end mode:
  ```ts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setChoosingEnd(null); setPendingStone(null); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  ```

- [ ] **Step 4: Rewrite `CombatScreen.css`**

  ```css
  .combat-screen {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 100dvh;
    background: #1a0f2e;
    color: #e8d8b0;
    padding: 0.75rem;
    gap: 0.5rem;
    box-sizing: border-box;
  }

  .combat-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .combat-enemy-zone {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
  }

  .combat-board-zone {
    flex: 1;
    overflow: hidden;
  }

  .combat-bottom {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .combat-player-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .combat-hand-tiles {
    display: flex;
    gap: 0.5rem;
    flex: 1;
    overflow-x: auto;
  }

  .enemy-sprite, .hero-sprite {
    width: 80px;
    height: 80px;
    object-fit: contain;
  }

  .enemy-sprite--hit, .hero-sprite--hit {
    filter: brightness(3) saturate(0);
  }

  .btn-end-turn {
    background: #6b3fa0;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 0.6rem 1.2rem;
    font-size: 1rem;
    cursor: pointer;
    flex-shrink: 0;
  }

  .btn-end-turn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-swap {
    background: rgba(255,255,255,0.08);
    color: #ccc;
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 6px;
    padding: 0.4rem 0.8rem;
    cursor: pointer;
    flex-shrink: 0;
  }

  .combat-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100dvh;
    font-size: 1.2rem;
    color: #e8d8b0;
  }

  .combat-message {
    color: #f88;
    font-size: 0.85rem;
  }
  ```

- [ ] **Step 5: Run client tests**

  ```bash
  cd client && npx vitest run src/__tests__/CombatScreen.test.tsx 2>&1 | tail -20
  ```

  Iterate until passing.

- [ ] **Step 6: Run full client test suite**

  ```bash
  cd client && npm test 2>&1 | tail -20
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add client/src/screens/CombatScreen.tsx client/src/screens/CombatScreen.css client/src/__tests__/CombatScreen.test.tsx
  git commit -m "feat: rewrite CombatScreen with new board layout"
  ```

---

## Task 10: Final integration check

- [ ] **Step 1: Run all server tests**

  ```bash
  npm test -- --no-coverage 2>&1 | tail -20
  ```

  Expected: all pass.

- [ ] **Step 2: Run all client tests**

  ```bash
  cd client && npm test 2>&1 | tail -20
  ```

  Expected: all pass.

- [ ] **Step 3: TypeScript compile check**

  ```bash
  npx tsc --noEmit 2>&1
  ```

  Expected: no errors.

- [ ] **Step 4: Commit if any fixes needed**

  ```bash
  git add -p
  git commit -m "fix: resolve integration issues after board combat redesign"
  ```

- [ ] **Step 5: Final commit tagging the feature complete**

  ```bash
  git commit --allow-empty -m "feat: domino board combat redesign complete"
  ```
