# Bag Initialization Design

**Date:** 2026-03-31
**Status:** Approved

## Summary

Replace the current starting bag (random 14 from full 28-stone set) with a curated generation that produces stones biased toward mid-range pip sums (5–7), giving players a more balanced and strategically interesting starting hand.

## Problem

The current `runs.ts` generates a full 28-stone set, shuffles it, and slices the first 14. This means the player can start with stones like `0-0` or `0-1` which deal almost no damage. The desired feel is a starting bag where most stones are "medium power" — enough to play meaningfully from turn 1.

## Design

### New Method: `Bag.generateStartingBag(count: number): Stone[]`

Added to the existing `Bag` class in `src/game/bag.ts`. Does not replace `generateFullSet()` — that method stays for enemy bags and shop refills.

**Pip sum groups and weights:**

| Group | Pip Sum | Pool | Weight |
|-------|---------|------|--------|
| Low | 5 | `[0-5, 1-4, 2-3]` | 25% |
| Mid | 6 | `[0-6, 1-5, 2-4, 3-3]` | 50% |
| High | 7 | `[1-6, 2-5, 3-4]` | 25% |

**Algorithm:**
1. For each of `count` iterations:
   - Roll weighted random: 25% → sum-5 group, 50% → sum-6 group, 25% → sum-7 group
   - Pick uniformly at random from that group's pool
   - Duplicates are allowed (with replacement)
2. After all stones are generated, pick one random stone and assign it a random element (Fire/Ice/Lightning/Poison/Earth). All others remain `element: null`.

This produces natural run-to-run variation while respecting the target distribution (~3–4 sum-5, ~7 sum-6, ~3–4 sum-7).

### Call Site Change: `server/src/routes/runs.ts`

Replace:
```ts
const defaultBag = new Bag();
defaultBag.shuffle();
const initialStones = defaultBag.stones.slice(0, 14);
```
With:
```ts
const bag = new Bag();
const initialStones = bag.generateStartingBag(14);
```

## What Does Not Change

- `Bag.generateFullSet()` — still used for enemy bags (`routes/combat.ts:671`, `routes/runs.ts:338`) and shop/event refills (`routes/nodes.ts`)
- Starting hand size: player still draws 7 from their 14-stone bag at combat start
- Shop, relics, and events can still add stones of any pip value to the bag

## Testing

New unit tests in `src/game/__tests__/bag.test.ts`:
- Distribution test: over 1000 iterations, sum-5/sum-6/sum-7 proportions land within ±10% of target (25/50/25)
- Element test: exactly 1 stone has a non-null element in the returned array
- Count test: returns exactly `count` stones
- Uniqueness: IDs are unique (no reference duplication)
