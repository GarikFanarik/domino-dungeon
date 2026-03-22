# Dungeon Map Redesign

**Date:** 2026-03-22
**Status:** Approved

---

## Summary

Redesign the dungeon map screen from a broken row-based layout to a proper fixed-column grid that renders bottom-to-top, matching dungeon-crawler conventions and making navigation visually clear.

---

## Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Layout system | Fixed column grid | Nodes share column slots across all rows — connections are clean diagonals |
| Direction | Bottom-to-top | Player climbs toward the boss; progress reads upward |
| Node shape | Circles with PNG icons | Existing icons, universally readable, retains current glow effects |
| Max columns | 5 | Tight, every routing decision matters; nodes are large enough to be clear |

---

## Layout System

### Fixed Column Grid

Replace the current DOM-measurement approach (`getBoundingClientRect` + `useNodePositions`) with a purely computed coordinate system. No DOM measurement. No ResizeObserver.

**Horizontal position** — all rows share the same 5 column slots. A node's x position is determined by its `col` field within a fixed `MAX_COLS = 5` grid:

```
x = (col + 1) / (MAX_COLS + 1) * 100
  → col 0 = 16.7%,  col 1 = 33.3%,  col 2 = 50%,  col 3 = 66.7%,  col 4 = 83.3%
```

This means a col-1 node in a 3-node row and a col-1 node in a 5-node row both land at x=33.3%, giving true column alignment and clean diagonals.

**Boss row special case** — the boss row always has 1 node (col=0). Since `(0+1)/(5+1) = 16.7%` would pin it to the left, the boss node is always centred: `x = 50%`.

**Vertical position** — rows are flipped so row 0 (start) is at the bottom:

```
totalRows = Math.max(...nodes.map(n => n.row)) + 1   // derived from live data, not hardcoded
y = (1 - (row + 0.5) / totalRows) * 100
  → row 0 (start) ≈ bottom,  row totalRows-1 (boss) ≈ top
```

### SVG Coordinate System

The `<svg>` element uses `viewBox="0 0 100 100"` and `preserveAspectRatio="none"`, stretched to fill the map area with CSS (`width: 100%; height: 100%`). All `x1`, `y1`, `x2`, `y2` line coordinates are user units 0–100 (same as percentage values above). This requires no DOM measurement.

### Connection Lines

SVG lines drawn between connected node pairs:
- Colour: `rgba(120, 90, 40, 0.55)`
- Stroke-dasharray: `6 4`
- Stroke-width: `0.4` (in viewBox user units — looks like ~2px at screen scale)
- Lines rendered behind nodes (SVG is a sibling behind the node container)

---

## Node Appearance

Circles, absolutely positioned within the map area using `left` / `bottom` CSS percentages derived from the coordinate formulas above.

- **Icon:** PNG from `/assets/map/nodes/{type}.png`, centred, ~52px
- **Label:** Node type name below icon, 14px
- **Size:** 120px × 120px (up from current 104px)
- **Available:** Gold border + glow + pulse animation (existing)
- **Unavailable:** Greyscale icon, dim border, low opacity (existing)
- **Completed:** Very low opacity (existing)
- **Current:** Bright gold ring highlight (existing)
- **Boss:** Red border colour (existing)
- **Elite:** Purple border colour (existing)

---

## Rendering

Nodes are rendered as absolutely-positioned `<button>` elements inside the map container, positioned via inline `style={{ left: '33.3%', bottom: '14.3%' }}`. No flex rows. No `.map-rows` or `.map-row` divs.

The map container is `position: relative; width: 100%; height: 100%`.

---

## Files Changed

| File | Change |
|------|--------|
| `client/src/screens/DungeonMapScreen.tsx` | Remove `useNodePositions`, remove flex-row rendering, add computed coordinate system, render nodes as absolute-positioned buttons, render boss centred |
| `client/src/screens/DungeonMapScreen.css` | Remove `.map-rows` / `.map-row` rules; add positioning for absolute node layout; adjust node size to 120px |
| `client/src/__tests__/DungeonMapScreen.test.tsx` | Update tests that query `.map-row` / `.map-rows`; add tests for bottom-to-top order and coordinate computation |

No backend changes required. The `row` and `col` fields already exist on `MapNode`.

---

## What Does Not Change

- Map generation logic (`src/dungeon/map-generator.ts`) — unchanged
- Node types, icons, colours, animations — unchanged
- Top bar (HP, gold, element counts) — unchanged
- API endpoints — unchanged
