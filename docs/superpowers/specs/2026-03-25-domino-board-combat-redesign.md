# Domino Board Combat Redesign

**Date:** 2026-03-25
**Status:** Approved

---

## Overview

Complete redesign of the combat battle system and UI. The current linear `Chain` model is replaced by a proper `Board` class with explicit 2D tile positions. Both the player and enemy play onto the same shared board. The UI is rebuilt to match a new layout with a central grid board, hero/enemy icons with adjacent HP bars, a hidden enemy hand, relics top-left, and the player hand bottom-center.

---

## 1. Data Model

### `BoardTile`

```ts
interface BoardTile {
  id: string;              // randomUUID() assigned at placement time
  stone: Stone;            // full stone data (pips + element)
  x: number;               // left edge column of the tile (tile occupies columns x and x+1)
  y: number;               // grid row
  orientation: 'h' | 'v'; // always 'h' in this implementation
  flipped: boolean;        // see "flipped semantics" below
  side: 'left' | 'right';  // which board end this tile was played on
  playedBy: 'player' | 'enemy';
  turnNumber: number;      // session.turnNumber at time of placement, before end-turn increment
}
```

### `flipped` Semantics

`flipped` means "the stone is placed in reversed orientation (right pip visually left, left pip visually right)."

**Right-end play (`side: 'right'`):**
- `flipped=false`: `stone.leftPip` connects to `rightOpen`; new `rightOpen = stone.rightPip`
- `flipped=true`: `stone.rightPip` connects to `rightOpen`; new `rightOpen = stone.leftPip`

**Left-end play (`side: 'left'`):**
- `flipped=false`: `stone.rightPip` connects to `leftOpen`; new `leftOpen = stone.leftPip`
- `flipped=true`: `stone.leftPip` connects to `leftOpen`; new `leftOpen = stone.rightPip`

Server computes `flipped` automatically in `playStone`:
- Right-end: `flipped = stone.rightPip === rightOpen`
- Left-end: `flipped = stone.leftPip === leftOpen`

### `BoardJSON` (serialized shape)

```ts
interface BoardJSON {
  tiles: BoardTile[];          // insertion-order history
  orderedTiles: BoardTile[];   // left-to-right chain order
  leftOpen: number | null;
  rightOpen: number | null;
  rightHead: { x: number; y: number; dir: 'right' | 'left' };
  leftHead: { x: number; y: number; dir: 'right' | 'left' };
  maxCol: number;              // right boundary of grid (starts 20, grows on collision)
}
```

`Board.fromJSON` fully restores the Board from `BoardJSON` — including head state. No recomputation needed.

### `Board` class (replaces `Chain` in the session layer)

```ts
class Board {
  readonly leftOpen: number | null
  readonly rightOpen: number | null

  canPlay(stone: Stone): { left: boolean; right: boolean }
  // Empty board: { left: false, right: true } for any stone
  // Non-empty:
  //   left=true  iff leftOpen !== null && (stone.leftPip === leftOpen || stone.rightPip === leftOpen)
  //   right=true iff rightOpen !== null && (stone.leftPip === rightOpen || stone.rightPip === rightOpen)

  playStone(stone, side, playedBy, turnNumber): BoardTile
  // 1. Compute flipped per rules above
  // 2. Update leftOpen or rightOpen on this Board instance
  // 3. Compute (x, y) via snake layout algorithm below
  // 4. Append to tiles[]; append or prepend to orderedTiles[] (right→append, left→prepend)
  // Both player and enemy plays update the shared leftOpen/rightOpen.

  getTilesForTurn(turnNumber: number, playedBy: 'player' | 'enemy'): BoardTile[]
  // playedBy is REQUIRED (player and enemy share the same turnNumber)
  // Filters orderedTiles by turnNumber AND playedBy

  toChainForTurn(turnNumber: number, playedBy: 'player' | 'enemy'): Chain

  toJSON(): BoardJSON
  static fromJSON(json: BoardJSON): Board
}
```

### `toChainForTurn` Specification

**Purpose:** Bridge to `calculateDamage` and `analyzeChain` (unchanged functions). Returns a throwaway `Chain` for use only within a single end-turn computation.

**Key point:** The returned `Chain` is built via `Chain.fromPlacedStones`, which directly assigns the `stones` array without calling `playStone`. The Chain's `leftOpen`/`rightOpen` will be `null`. This is intentional — `calculateDamage` and `analyzeChain` only read `chain.stones[i].stone` and `chain.stones[i].flipped`; they never read the Chain's open-end fields.

**Mapping rule** (produces `PlacedStone.flipped` so that `calculateDamage` reads the correct junction pip):

`calculateDamage` identifies junction pip as: `flipped=false → stone.leftPip; flipped=true → stone.rightPip`.

- `tile.side === 'right'`: `chainFlipped = tile.flipped` (direct copy — same convention)
- `tile.side === 'left'`: `chainFlipped = !tile.flipped` (inverted — left-end convention is the mirror)

**Worked examples:**

*Right-end:* `rightOpen=3`, stone `[2|3]`: `flipped=(3===3)=true` → `chainFlipped=true` → junction=`rightPip=3` ✓

*Left-end:* `leftOpen=5`, stone `[5|1]`: `flipped=(5===5)=true` → `chainFlipped=!true=false` → junction=`leftPip=5` ✓

**Algorithm:**
```ts
toChainForTurn(turnNumber, playedBy): Chain {
  const tiles = this.getTilesForTurn(turnNumber, playedBy);
  const placed: PlacedStone[] = tiles.map(tile => ({
    stone: tile.stone,
    side: 'right' as const,
    flipped: tile.side === 'right' ? tile.flipped : !tile.flipped,
  }));
  return Chain.fromPlacedStones(placed);
}
```

### `Chain.fromPlacedStones` (new static method on existing `Chain` class)

```ts
static fromPlacedStones(stones: PlacedStone[]): Chain {
  const c = new Chain();
  (c as any).stones = stones;   // directly assign; leftOpen/rightOpen stay null
  return c;
}
```

No other changes to `chain.ts`.

### Snake Layout Algorithm

**Grid:** 8 rows (0–7). `maxCol` starts at 20 (effective right boundary). Each tile occupies `(x, y)` and `(x+1, y)` — width is 2 columns.

**Initial state after first tile at `(10, 4)`:**
- `rightHead = { x: 12, y: 4, dir: 'right' }` — next right-end tile placed at column 12 (no overlap with first tile at 10–11)
- `leftHead  = { x: 8,  y: 4, dir: 'left'  }` — next left-end tile placed at column 8 (occupies 8–9, no overlap)
- `maxCol = 20`

**rightHead advance** (called after placing a right-end tile at `rightHead.x, rightHead.y`):
```
if dir === 'right':
  x += 2
  if x + 1 >= maxCol:          // next tile would reach or exceed right boundary
    y = min(y + 1, 7)
    dir = 'left'
else:  // dir === 'left'
  x -= 2
  if x < 0:                    // next tile would go off left edge
    y = min(y + 1, 7)
    dir = 'right'
```

**rightHead collision** (check before placing: is `(rightHead.x, rightHead.y)` already occupied by a leftHead-placed tile?):
```
maxCol += 4
dir = 'right'
x = maxCol - 2   // place at new far-right column
```

**leftHead advance** (called after placing a left-end tile at `leftHead.x, leftHead.y`):
```
if dir === 'left':
  x -= 2
  if x < 0:
    y = min(y + 1, 7)
    dir = 'right'
else:  // dir === 'right'
  x += 2
  if x + 1 >= maxCol:
    y = min(y + 1, 7)
    dir = 'left'
```

**leftHead collision** (check before placing: is `(leftHead.x, leftHead.y)` already occupied by a rightHead-placed tile?):
```
maxCol += 4
dir = 'left'
x = 0            // place at new far-left column (effectively 0)
```
The board scrolls to accommodate all tiles when content exceeds the visual width.

All tiles have `orientation: 'h'`.

### Enemy Stone Fate

Enemy stones are **removed from `enemyHand`** during the AI loop and **discarded** — not returned to the bag. They remain on the board as `BoardTile` objects permanently.

### `stonesPlayedTotal` (session counter)

`session.stonesPlayedTotal: number` is a **standalone session counter** that persists across turns independently of the board. It is not derived from board tile counts. It starts at 0 and increments by `gloveTiles.length` at step 6 of each end-turn.

### Session Schema Changes

```ts
// Removed from CombatSession:
chain: { stones: PlacedStone[]; leftOpen: number | null; rightOpen: number | null }

// Added:
board: BoardJSON
enemyHand: Stone[]
enemyHandSize: number   // default 5
// stonesPlayedTotal already exists; no change needed
```

**Enemy hand initialisation:** Player draws 7 from the shared bag first, then enemy draws 5 from the same bag. Board begins with `initialBag.length - 12` stones.

**Hand refill:** "Refill to target size" means draw enough stones to reach the target (player: 7, enemy: 5) — i.e., `draw(max(0, targetSize - currentHandSize))`. Not "draw N regardless."

---

## 2. Turn Flow

### Player Turn

1. Player sees hand (7 tiles, face-up) and board with both open ends highlighted
2. Player clicks a tile:
   - Only one end matches → placed automatically on that end
   - Both ends match → "choose end" mode: both ends pulse; player clicks the desired end; Escape or re-click same tile cancels
   - Neither end matches → click ignored
3. Client sends `POST /combat/play` with `{ stoneIndex: number, side: 'left' | 'right' }` — **`side` always required**. Server returns `400` if side is invalid, if the board end is closed, or if the stone pip does not match the chosen open end.
4. Player can keep playing as long as they have matching tiles
5. 1 swap per turn: `POST /combat/swap` — unchanged
6. When no playable tiles remain and swap is unavailable or unhelpful, player presses **End Turn**

### End Turn (server, `POST /combat/end-turn`)

**`current`** = `session.turnNumber` at the start of this handler, before step 18 increments it.

```
1.  playerChain = board.toChainForTurn(current, 'player')
2.  analysis = analyzeChain(playerChain, relics)
3.  effects = applyChainEffects(analysis, playerState, enemy, relics)
4.  playerDamage = calculateDamage(playerChain, ...).finalDamage

5.  gloveTiles = board.getTilesForTurn(current, 'player')
    gloveBase = session.stonesPlayedTotal    ← capture BEFORE step 6 increments it
    ChainMastersGlove: for each gloveTiles[i]:
      stonePipDmg = (t.stone.leftPip + t.stone.rightPip) × 2
      cumPos = gloveBase + i + 1
      apply applyChainMastersGlove(cumPos, stonePipDmg)

6.  session.stonesPlayedTotal += gloveTiles.length   ← AFTER step 5

7.  TheLastStone relic: gloveTiles.length === 1 check
8.  VoltaicLens relic: analysis.overloadTriggered
9.  InfiniteBag relic: gloveTiles.map(t => t.stone) returned to bag

10. Deal playerDamage to enemy
11. If enemy dead:
      TravelerBoots: goldBonus = applyTravelerBoots(gloveTiles.length); add to playerGold
      (all other win-path logic unchanged: CurseOfGreed, BloodPact, gold award, stoneRewards, etc.)
      return combatResult: 'player-won'

12. Enemy AI: plays tiles from enemyHand onto board using current leftOpen/rightOpen
    (open ends left by player's plays this turn). playedBy='enemy', turnNumber=current.
    Enemy stones removed from enemyHand and discarded (not returned to bag).

13. enemyChain = board.toChainForTurn(current, 'enemy')
    enemyDamage = calculateDamage(enemyChain, ...).finalDamage

14. Apply armor to enemyDamage; deal net damage to player

15. Tick burn/poison DoT on enemy; decay slow/stun/frozen — unchanged

16. Check player death → combatResult: 'player-died'

17. Refill player hand to 7 from bag; refill enemy hand to 5 from bag
    (draw up to target size; always runs, even if enemy had no playable tiles)

18. session.turnNumber += 1   ← AFTER all damage calcs for current

19. session.swapsUsed = 0
```

### Enemy AI (`enemy-board-ai.ts` — new class; `EnemyAI` from `enemy-ai.ts` no longer imported by combat route)

```
1. candidates = all (stone, side) pairs in enemyHand where board.canPlay(stone)[side] === true
2. For each candidate, score = connecting pip value:
     side='right': connecting pip = stone.rightPip if flipped else stone.leftPip
     (same flipped logic as playStone: flipped = stone.rightPip===rightOpen for right-end)
3. Pick highest score; prefer 'right' on tie
4. board.playStone(stone, side, 'enemy', current); remove stone from enemyHand (discard)
5. Repeat from step 1 until candidates is empty
6. If candidates empty at step 1: skip (enemy plays 0 tiles; 0 enemy damage this turn)
```

---

## 3. API Types

### `POST /combat/play` request body

```ts
{ stoneIndex: number; side: 'left' | 'right' }
```

`400` conditions:
- `stoneIndex` out of range
- `side` not `'left'` or `'right'`
- Stone pip does not match the chosen open end (`side='left'` and neither pip matches `leftOpen`; `side='right'` and neither pip matches `rightOpen`)
- Board is empty and `side='left'`

### `CombatStateResponse` (updated)

```ts
interface CombatStateResponse {
  enemy: { id: string; name: string; hp: { current: number; max: number }; status: EnemyStatus }
  playerHand: Stone[]
  board: BoardJSON           // replaces chain / leftOpen / rightOpen (REMOVED)
  enemyHandCount: number     // count only — pip values never sent to client
  playerState: PlayerState
  turnNumber: number
  phase: 'player-turn' | 'enemy-turn' | 'resolving'
  swapsUsed: number
  swapsPerTurn: number
  bag: Stone[]
}
// REMOVED fields: chain, leftOpen, rightOpen
// Clients read leftOpen/rightOpen from board.leftOpen / board.rightOpen
```

### `PlayStoneResponse` (updated)

```ts
interface PlayStoneResponse {
  board: BoardJSON
  hand: Stone[]
}
```

### `EndTurnResponse` (updated)

The `enemyAttack.stone` field (singular) is **replaced** by `enemyAttack.stonesPlayed: { leftPip: number; rightPip: number }[]` — an array of the tiles the enemy played this turn (may be empty if enemy skipped). All other `EndTurnResponse` fields are unchanged.

```ts
// Before:
enemyAttack?: { stone: { leftPip: number; rightPip: number }; rawDamage: number; armorBlocked: number; damage: number }

// After:
enemyAttack?: { stonesPlayed: { leftPip: number; rightPip: number }[]; rawDamage: number; armorBlocked: number; damage: number }
```

### Removed types

- `UnplayStoneResponse` — deleted from `api.ts`
- `POST /combat/unplay` route — deleted from `combat.ts`

---

## 4. UI Layout

```
┌─────────────────────────────────────────────────────┐
│ [Relic1][Relic2]…       [▓][▓][▓][▓][▓]   [Enemy ] │
│ (RelicBar)               Enemy Hand         [HPbar ] │
│                          (face-down count)  (icon+hp)│
│         ┌─────────────────────────────┐             │
│         │                             │             │
│         │       DOMINO BOARD          │             │
│         │    (2D grid, scrollable)    │             │
│         └─────────────────────────────┘             │
│ [Hero ]                                             │
│ [HPbar]  [Bag]  [tile][tile][tile][tile]…  [End Turn]│
│  (icon+  (swap       Player Hand                    │
│   hp)    count)                                     │
└─────────────────────────────────────────────────────┘
```

### UI Components

| Component | Description |
|---|---|
| `CombatScreen` | New root layout — full rewrite |
| `DominoBoard` | New — renders 8-row grid; places `DominoStone` at `(x, y)` from `BoardTile`; highlights open ends with glow |
| `EnemyHand` | New — renders N face-down tile backs + count; pip values never in DOM |
| `DominoStone` | Unchanged |
| `HPBar` | Unchanged |
| `RelicBar` | Unchanged — top-left |
| `RelicIcon` | Unchanged |
| `EnemyTurnSequence` | Unchanged — updated to use `enemyAttack.stonesPlayed[]` instead of `enemyAttack.stone` |
| `GoldDisplay` | Unchanged |

### Layout Rules

- **Enemy icon + HP bar**: top-right; portrait flashes red on hit
- **Enemy hand**: top-center; face-down tile backs, count shown, pip values never revealed
- **Relics**: top-left; `RelicBar`
- **Domino board**: center; fixed 8-row height, scrollable width; left/right open ends highlighted
- **Hero icon**: bottom-left; flashes red on hit
- **Player HP bar**: directly below hero portrait
- **Tile bag**: bottom-left next to hero, shows count, click to enter swap mode
- **Player hand**: bottom-center, horizontal row; playable tiles bright, unplayable dimmed
- **End Turn button**: bottom-right

### Choose-End Mode

When player clicks a tile matching both open ends:
1. Both open ends on the board pulse/glow
2. Player clicks desired end → tile placed; `side` sent to server
3. Escape or re-clicking the same hand tile cancels

---

## 5. File Changes

### New
- `src/game/board.ts`
- `src/game/ai/enemy-board-ai.ts`
- `src/game/__tests__/board.test.ts`
- `src/game/ai/__tests__/enemy-board-ai.test.ts`
- `client/src/components/DominoBoard.tsx`
- `client/src/components/EnemyHand.tsx`
- `client/src/components/__tests__/DominoBoard.test.tsx`
- `client/src/components/__tests__/EnemyHand.test.tsx`

### Modified (not deleted)
- `src/game/chain.ts` — gains `Chain.fromPlacedStones(stones: PlacedStone[]): Chain` static method only
- `src/game/ai/enemy-ai.ts` — no longer imported by combat route; file kept (not deleted)
- `src/session/combat-session.ts` — `chain` → `board`; add `enemyHand`, `enemyHandSize`
- `src/types/api.ts` — updated shapes; `UnplayStoneResponse` deleted; `EndTurnResponse.enemyAttack.stone` → `stonesPlayed[]`
- `server/src/routes/combat.ts` — routes updated; `/unplay` deleted; `/play` requires `side`; end-turn uses Board and new AI
- `client/src/screens/CombatScreen.tsx` — full rewrite
- `client/src/screens/CombatScreen.css` — full rewrite
- `client/src/components/EnemyTurnSequence.tsx` — updated for `stonesPlayed[]`
- `server/src/__tests__/combat.test.ts` — updated for new API
- `client/src/__tests__/CombatScreen.test.tsx` — updated for new layout
- `client/src/components/__tests__/EnemyTurnSequence.test.tsx` — updated

---

## 6. Edge Cases

| Scenario | Handling |
|---|---|
| Both ends match | Client sends `side` explicitly; server validates |
| First tile | `canPlay → { left:false, right:true }`; `side:'right'`; placed at `(10,4)`; both opens set |
| Snake heads collide | `maxCol+=4`; offending head repositions to new boundary; board scrolls |
| Board exceeds 20 cols | Grid scrolls horizontally |
| Bag empty, player wants to swap | Swap button disabled |
| Enemy no playable tiles | Skip; 0 damage; refills to 5 at step 17 |
| Bag + enemy hand exhausted | Enemy never plays again; combat continues |
| Enemy skips turn | Refill still runs at step 17 (draw up to 5) |

---

## 7. What Does NOT Change

- `calculateDamage`, `analyzeChain`, `applyChainEffects` — signatures unchanged; receive a `Chain` via `toChainForTurn`
- `Chain` class — gains one static method only
- All element effects, relic formulas (Glove uses pip-sum as before), DoT, status decay, stone rewards, swap mechanic
- `RelicBar`, `HPBar`, `DominoStone`, `GoldDisplay`
- `TravelerBoots` fires only on combat win (step 11), same as today — using `gloveTiles.length` instead of `chain.stones.length`

**Intentional change:** Enemy damage now uses `calculateDamage(toChainForTurn(current, 'enemy'))`. A single-stone enemy turn = 0 junction damage.
**`EnemyTurnSequence`**: updated for `stonesPlayed[]` shape (minor prop change only).

---

## 8. Testing Strategy (TDD — tests written before implementation)

| File | Coverage |
|---|---|
| `chain.test.ts` | `fromPlacedStones` builds Chain with correct stones; `leftOpen`/`rightOpen` are null |
| `board.test.ts` | `canPlay` empty and non-empty; `flipped` auto-computed right and left; `orderedTiles` order; snake positions (first tile, rightHead advance, leftHead advance, row wrap, collision extends maxCol); `getTilesForTurn` by turn and player; `toChainForTurn` flipped translation and junction damage (worked examples); `leftOpen`/`rightOpen` after player and enemy plays; `BoardJSON` round-trip restores head state |
| `enemy-board-ai.test.ts` | Greedy scoring; multi-play per turn; stops when no match; prefer right on tie; stones removed from hand |
| `combat.test.ts` | `/play` with `side`; 400 on wrong side/pip mismatch; player damage isolation; enemy plays on shared open ends; TravelerBoots fires only on win; `gloveBase` pre-increment; `stonesPlayedTotal` incremented after Glove; `turnNumber` incremented at step 18; refill always runs |
| `CombatScreen.test.tsx` | 8 layout zones; choose-end mode; enemy hand count not pips; End Turn disabled during enemy turn |
| `DominoBoard.test.tsx` | Tiles at correct `(x,y)`; open ends highlighted; scrollable |
| `EnemyHand.test.tsx` | Count shown; pip values absent from DOM |
| `EnemyTurnSequence.test.tsx` | Updated for `stonesPlayed[]` |
