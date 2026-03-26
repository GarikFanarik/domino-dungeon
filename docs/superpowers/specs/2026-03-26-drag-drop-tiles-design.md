# Drag & Drop Domino Tiles — Design Spec

**Date:** 2026-03-26
**Status:** Approved

---

## Overview

Replace the current click-to-select + click-end-button flow with pointer-event-based drag and drop. Players drag a tile from their hand onto the board. Pressing R while dragging flips the tile, which determines which end of the board it attaches to.

---

## State & Data Flow

A `dragState` object lives in `CombatScreen`:

```typescript
interface DragState {
  stoneIndex: number;
  stone: Stone;
  flipped: boolean;   // R key toggles this
  x: number;          // cursor x for floating overlay
  y: number;          // cursor y for floating overlay
}
```

**Lifecycle:**

1. `pointerdown` on a hand tile → set `dragState`, capture pointer on the element
2. `pointermove` on window → update `dragState.x/y`
3. `keydown R` (while drag active) → toggle `dragState.flipped`
4. `pointerup` on window:
   - Use `document.elementFromPoint` to check if cursor is over the board drop zone
   - **Not over board** → clear `dragState` (snap back, no play)
   - **Over board, `flipped=false`** → attempt `playStone(stoneIndex, 'right')`
   - **Over board, `flipped=true`** → attempt `playStone(stoneIndex, 'left')`
   - **Stone doesn't match target end** → flash red on overlay, snap back
5. `Escape` → cancel drag, clear `dragState`

`pointermove` and `pointerup` listeners are added to `window` on drag start and removed on drag end.

The existing `choosingEnd` / `pendingStone` state and all click-to-play handlers are removed. The `playStone` API call is unchanged.

---

## Components

### `DominoStone`
- Replace `onClick` prop with `onPointerDown`
- `disabled` tiles block drag (no `onPointerDown`)
- Add optional `flipped` prop: when true, renders with `leftPip`/`rightPip` swapped (not CSS mirror — actual prop swap so the rendered tile matches what will be played)

### `DragOverlay` (new component)
- Rendered at top level of `CombatScreen` when `dragState` is set
- Renders a `DominoStone` at `dragState.x/y` via `position: fixed`
- Passes stone with pips swapped when `dragState.flipped=true`
- `pointer-events: none` so it doesn't interfere with drop detection
- Shows small directional label: `"← L"` or `"R →"` indicating current target end, updates live

### `DominoBoard`
- Remove `choosingEnd` and `onEndSelect` props entirely
- Remove open-end pulse buttons
- Add `data-drop-zone="board"` attribute for drop detection
- Accept `dragValidEnds?: { left: boolean; right: boolean }` prop — when set (tile being dragged), highlights the valid end zone(s) with a gold glow

### `CombatScreen`
- Owns all drag state
- Computes `dragValidEnds` from `canStonePlay(dragState.stone, combat.board)` while drag is active
- Passes `dragValidEnds` to `DominoBoard`

---

## Rotation & Drop Logic

**R key:** Toggles `dragState.flipped`. Overlay re-renders with pips swapped.

**Side selection:**
```
flipped=false → targeting RIGHT end
flipped=true  → targeting LEFT end
```

**First tile (empty board):** Both ends are open. Flip freely — the orientation dropped determines how the tile is placed. No special-casing needed; `canStonePlay` already returns `{ left: true, right: true }` for an empty board.

**Drop validation:**
1. Determine `side` from `dragState.flipped`
2. Check `canStonePlay(stone, board)[side]`
3. If valid → `playStone(stoneIndex, side)`
4. If invalid → brief red flash on overlay tile, `dragState` cleared (tile stays in hand)

---

## Visual Feedback

| Moment | Feedback |
|--------|----------|
| Drag starts | Source tile in hand → opacity ~0.3 |
| During drag | Floating overlay tile follows cursor, `scale(1.05)`, `grabbing` cursor |
| R pressed | Overlay tile visually flips (pips swap), `"← L"` / `"R →"` label updates |
| Hovering board | Valid end zone(s) get gold border glow; invalid zones unchanged |
| Invalid drop | Overlay tile flashes red briefly, then disappears |
| Valid drop | Overlay disappears, tile plays via existing board animation |
| Drag cancelled (Escape / drop off-board) | Overlay disappears, hand tile returns to full opacity |

---

## Removed

- `choosingEnd` state and `'both'` end-selection modal flow
- `pendingStone` state
- Open-end pulse buttons on `DominoBoard`
- `onEndSelect` prop on `DominoBoard`
- Click handlers on `DominoStone` in hand

---

## Out of Scope

- Touch / mobile drag (pointer events work on touch too, but no special touch UI)
- Animated snap-back on invalid drop (just disappears)
- Drag reorder within hand
