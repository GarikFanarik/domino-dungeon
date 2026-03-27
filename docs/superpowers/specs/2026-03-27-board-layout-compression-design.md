# Board Layout & Chain Compression — Design Spec
**Date:** 2026-03-27

## Problem

The domino board currently uses a grid-based snake layout (tiles placed at absolute x/y coordinates, wrapping to a new row when full). This causes:
- Tiles that wrap between rows look like two unrelated rows, not a connected chain
- x/y positioning logic lives in `board.ts` (game model), mixing display concerns into game state
- The chain grows unboundedly, making older tiles irrelevant noise

## Goals

1. Replace the grid layout with a **linear horizontal scrollable band** — no wrapping
2. **Remove x/y grid logic from `board.ts`** — keep only game-relevant state
3. **Compress the chain after each End Turn** — show only the shortest valid subsequence
4. **Animate enemy tile entry and compression exit** so the player understands what happened
5. **Add tests** for the compression algorithm and drag-valid-end highlighting

---

## Compression Algorithm

### Location
New pure function `compressChain(tiles: BoardTile[]): BoardTile[]` in `src/game/board.ts`.

### Algorithm
Greedy, left to right:
1. If `tiles.length <= 2`, return as-is
2. Start result with `tiles[0]`
3. From current tile, compute its outgoing pip (right display pip)
4. Scan forward to find the **furthest** tile whose incoming pip (left display pip) matches
5. Add that tile to result, continue from there
6. Always terminates at the last tile

Display pip calculation accounts for `tile.flipped`:
- Left display pip = `flipped ? stone.rightPip : stone.leftPip`
- Right display pip = `flipped ? stone.leftPip : stone.rightPip`

### Example
```
Input:  [5|4]-[4|1]-[1|3]-[3|5]-[5|2]-[2|4]-[4|6]-[6|1]
[5|4] outgoing=4 → furthest match: [4|6]
[4|6] outgoing=6 → furthest match: [6|1] (last)
Output: [5|4]-[4|6]-[6|1]
```

### When it runs
After **End Turn** completes and the server returns the new board state — not after individual tile placements.

---

## Board Model Cleanup (`board.ts`)

### Remove from `BoardTile`
- `x`, `y`, `orientation` — only used for grid display

### Remove from `Board` / `BoardJSON`
- `rightHead`, `leftHead`, `maxCol` — only used for grid positioning
- Head-advancement and collision-detection logic in `playStone()`

### Keep
- `leftOpen`, `rightOpen` — pip values for game rules
- `orderedTiles` — chain order (used for display and compression)
- `flipped` on each tile — which direction the tile faces
- `canPlay()`, `playStone()`, `_firstPlaced`

`playStone()` becomes significantly simpler: just update `leftOpen`/`rightOpen` and push to `orderedTiles`.

---

## Linear Layout (`DominoBoard`)

### Layout
- Use `board.orderedTiles` instead of `board.tiles` + x/y
- Flex row, no wrapping, `overflow-x: auto`
- Tiles sit directly adjacent — no `gap`, borders touch — giving a seamless chain appearance
- After End Turn, auto-scroll to the **right end** (most recent play)

### Drag-Valid-End Highlights
Currently absolutely positioned inside the grid — replaced by **flex siblings** at the start and end of the tile row. Simpler, always correctly aligned with actual tile positions.

### Tile Adjacency
No gap between tiles in the flex container. To avoid doubled borders: tiles get `border-right: none` except the last one, so borders merge seamlessly into a continuous chain appearance.

---

## Animation

Triggered when `DominoBoard` receives new `orderedTiles` after End Turn.

### Phase 1 — Enemy tiles enter (~400ms)
- Diff previous vs. new `orderedTiles` to find newly added enemy tiles
- Apply CSS class `board-tile--entering` → fade in
- Player tiles have **no enter animation** (already placed via drag & drop)

### Phase 2 — Compression (~300ms, after Phase 1)
- Run `compressChain()` on new `orderedTiles`
- Tiles that are in `orderedTiles` but not in compressed result get `board-tile--exiting` → shrink/fade out
- After animation ends, DOM updates to compressed chain

### State tracking
`DominoBoard` manages internal animation state:
- `enteringIds: Set<string>` — tile IDs in enter phase
- `exitingIds: Set<string>` — tile IDs in exit phase
- `displayTiles: BoardTile[]` — what's currently rendered (may differ from `orderedTiles` during animation)

---

## Tests

### `compressChain()` — unit tests in `src/game/__tests__/board.test.ts`
- Chain with ≤2 tiles → returned unchanged
- Example from spec: 8-tile chain → 3-tile result
- Chain where no shortcut exists → returned unchanged
- Multiple shortcuts → always takes the furthest
- Chain with flipped tiles → display pips used correctly

### `DominoBoard` — render tests in `client/src/components/__tests__/DominoBoard.test.tsx`
- `drag-valid-end--left` present when `dragValidEnds.left = true`
- `drag-valid-end--right` present when `dragValidEnds.right = true`
- Neither present when `dragValidEnds` is undefined

---

## Files Changed

| File | Change |
|---|---|
| `src/game/board.ts` | Remove x/y grid logic, add `compressChain()` |
| `src/game/__tests__/board.test.ts` | Add `compressChain` unit tests |
| `client/src/components/DominoBoard.tsx` | Linear layout, animation state, flex siblings for end highlights |
| `client/src/components/DominoBoard.css` | New linear layout styles, enter/exit animations |
| `client/src/components/__tests__/DominoBoard.test.tsx` | Add drag-valid-end tests |
| `client/src/screens/CombatScreen.tsx` | Pass `orderedTiles` trigger for post-turn compression |
| `server/src/routes/combat.ts` | Ensure `BoardJSON` shape matches (remove x/y fields from responses) |
