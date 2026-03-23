# Relic UI Redesign — Spec

**Date:** 2026-03-23

## Goal

Improve the visual presentation of relics across three contexts so they feel polished and consistent with state-of-the-art deckbuilder games (Slay the Spire, Monster Train). Each context has a different size and layout need; the current implementation uses a single `RelicIcon` component everywhere with tiny 2.5rem images and duplicate text labels that clash with surrounding UI.

---

## Decisions Made

| Context | Chosen style |
|---------|-------------|
| Relic Selection Screen | **C — Large hero image (140×140px)**, centered in card |
| Shop Screen | **A — Horizontal card**, 72×72px image on left, text on right |
| Relic Bar (inventory) | **C — Square icon with rarity stripe**, 52×52px, no text labels |

---

## Architecture

### Shared utility: `client/src/utils/relicImage.ts` (new file, new directory)
Extract the `RELIC_IMAGES` record currently inside `RelicIcon.tsx` into a new file. Export a `relicImage(type: string): string | undefined` function. This lets the selection screen and shop resolve paths without importing the full `RelicIcon` component. The `client/src/utils/` directory does not currently exist and must be created.

### `RelicIcon` component (relic bar only)
Redesign to match **Option C**:
- 52×52px square, `border-radius: 8px`, `overflow: hidden`
- PNG image fills the square (`width: 100%; height: 100%; object-fit: contain`)
- **Fallback:** if `relicImage(type)` returns `undefined`, render a `✨` emoji span centred in the square (preserving current behaviour)
- 4px rarity-coloured stripe at bottom edge, implemented as a **CSS `::after` pseudo-element** (no TSX change needed)
- Border colour uses the existing CSS variables: `var(--neutral)` (common), `var(--armor)` (rare), `var(--earth)` (epic), `var(--gold)` (legendary)
- The stripe colour also uses those same variables
- No text labels (`.relic-icon__name` and `.relic-icon__rarity` elements removed from TSX)
- `title={relic.description}` already provides tooltip on hover
- Glow animation on trigger unchanged

### `RelicSelectionScreen` cards
- Replace `<RelicIcon>` with a direct `<img className="relic-card__art">` at **140×140px**
- `rarity` passed as a data attribute so CSS can colour the border: `data-rarity={relic.rarity}`
- **Fallback:** if `relicImage(relic.relicId)` returns `undefined`, hide the img (`display: none`)
- Card already renders name, rarity badge, description — no duplicate labels

**ID format note:** The real server returns `relicId` values as lowercase kebab-case strings matching the `RelicType` enum (e.g. `'phoenix-feather'`). The existing test mock uses uppercase snake-case (`'PHOENIX_FEATHER'`) which does not match `RELIC_IMAGES` keys — this is a test-data issue, not a runtime issue. The test mock will be updated to use real IDs so the image assertion works.

### `ShopScreen` relic cards
- Replace `<RelicIcon>` with a direct `<img className="shop-relic-art">` at **72×72px**
- **Fallback:** if `relicImage(item.relicId)` returns `undefined` (or `item.relicId` is `null`), hide the img
- Card layout becomes horizontal for relic items: add `shop-item-card--relic` class when `item.type === 'relic'`
- Non-relic items (stone, potion, removal) keep current vertical layout unchanged

---

## CSS Changes

### `RelicIcon.css`
- Remove `.relic-icon__name` and `.relic-icon__rarity` rule blocks (elements no longer rendered)
- `.relic-icon`: change to 52×52px fixed size, `overflow: hidden`, `border-radius: 8px`, remove `min-width` and `flex-direction: column`
- `.relic-icon__symbol`: fill the full square (remove fixed 2.5rem size)
- Add `::after` pseudo-element on `.relic-icon`: `position: absolute; bottom: 0; left: 0; right: 0; height: 4px`
- Rarity stripe colour (via `::after`): `.relic-icon--common::after { background: var(--neutral); }` etc.
- Ensure `.relic-icon` has `position: relative` for the `::after` to anchor

### `RelicSelectionScreen.css`
- Add `.relic-card__art`: `width: 140px; height: 140px; border-radius: 16px; border: 2px solid; object-fit: contain;`
- Rarity border/shadow variants via `[data-rarity]` selectors or sibling class on the card

### `ShopScreen.css`
- Add `.shop-item-card--relic`: `flex-direction: row; align-items: flex-start; gap: 16px`
- Add `.shop-relic-art`: `width: 72px; height: 72px; border-radius: 10px; border: 2px solid var(--gold); object-fit: contain; flex-shrink: 0`
- Add `.shop-relic-body`: `display: flex; flex-direction: column; gap: 6px; flex: 1`

---

## Files Changed

| File | Change |
|------|--------|
| `client/src/utils/relicImage.ts` | **New** — exports `RELIC_IMAGES` record and `relicImage(type)` function |
| `client/src/components/RelicIcon.tsx` | Remove name/rarity label elements; use `relicImage` from utils; keep ✨ fallback |
| `client/src/components/RelicIcon.css` | Redesign for 52px square+stripe bar style |
| `client/src/screens/RelicSelectionScreen.tsx` | Replace `<RelicIcon>` with 140px `<img>` using `relicImage` |
| `client/src/screens/RelicSelectionScreen.css` | Add `.relic-card__art` styles |
| `client/src/screens/ShopScreen.tsx` | Replace `<RelicIcon>` with 72px `<img>`, add horizontal relic card class |
| `client/src/screens/ShopScreen.css` | Add `.shop-item-card--relic`, `.shop-relic-art`, `.shop-relic-body` |

---

## Testing

- **`RelicIcon.test.tsx`**: Remove assertions checking for name/rarity label text. Add assertion that the `::after` stripe pseudo-element class is present (via rarity class on `.relic-icon`).
- **`RelicBar.test.tsx`**: Remove `expect(screen.getByText('Worn Pouch'))` and `expect(screen.getByText('Ember Core'))` assertions (labels no longer rendered). Replace with assertions that `.relic-icon` elements are rendered (one per relic).
- **`RelicSelectionScreen.test.tsx`**: Update mock to use real kebab-case relic IDs (`'phoenix-feather'` not `'PHOENIX_FEATHER'`). Add assertion that `screen.getAllByRole('img')` has length matching the number of offer cards.
- **`ShopScreen.test.tsx`**: Update mock relic item to include `relicId: 'worn-pouch'`. Add assertion that the relic card contains an `<img>`.
- All 269 existing tests must remain green after changes.

---

## Out of Scope

- Hover tooltip popup (beyond `title` attribute) — future enhancement
- Animated relic reveal on selection screen — future enhancement
