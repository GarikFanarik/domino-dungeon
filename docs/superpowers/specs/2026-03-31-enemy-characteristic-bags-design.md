# Enemy Characteristic Bags Design

**Date:** 2026-03-31
**Status:** Approved

## Summary

Each enemy draws from a curated bag that reflects their identity — a characteristic pip-sum range, one or more elements, and an elemental density. 90% of stones come from the enemy's characteristic pool; 10% are random from the full set. Enemy bags contain 21 stones total; 5 are dealt to hand at combat start.

## Enemy Configs

| Enemy | Pip Sum Range | Elements | Elemental Density |
|---|---|---|---|
| Tomb Rat | 2–5 | Poison | 10% |
| Crypt Sentinel | 5–7 | Earth | 20% |
| Stonewarden | 8–12 | Earth | 30% |
| Abyssal Crystal | 4–7 | Ice | 20% |
| Abyssal Warrior | 5–8 | Lightning | 25% |
| Abyssal Lord | 8–12 | Ice, Lightning | 35% |

## Data Model

Add `EnemyBagConfig` interface and `bagConfig` field to each template in `src/game/ai/enemy-templates.ts`:

```ts
export interface EnemyBagConfig {
  pipSumRange: [number, number];
  elements: ElementType[];
  elementalDensity: number; // fraction 0.0–1.0
}
```

Add `getEnemyBagConfig(enemyName: string): EnemyBagConfig` — a name-keyed lookup, falling back to a default neutral config (`[0,12]`, no elements, 0 density) for unknown enemies.

## Generation

Add `generateEnemyBag(config: EnemyBagConfig, count: number): Stone[]` to `src/game/bag.ts`.

**Algorithm:**
1. Build `characteristicPool`: all valid stone combos `(left, right)` where `left <= right` and `leftPip + rightPip` is within `config.pipSumRange`.
2. Build `fullPool`: all 28 standard combos.
3. For each of `count` stones:
   - Roll: 90% → pick uniformly from `characteristicPool`, 10% → pick uniformly from `fullPool`
   - Duplicates allowed (with replacement)
4. Assign elements: select `Math.floor(count × config.elementalDensity)` random indices (no duplicates), assign each a random element from `config.elements`.
5. Return the array.

## Call Site

In `server/src/routes/runs.ts`, replace:
```ts
const enemyBag = new Bag();
enemyBag.shuffle();
```
With:
```ts
const config = getEnemyBagConfig(enemyName);
const enemyBag = new Bag(generateEnemyBag(config, 21));
```

No shuffle needed — stones are already randomly generated.

## What Does Not Change

- Enemy hand size: still 5 drawn at combat start
- Enemy refill logic in `combat.ts`: unchanged, still draws from `session.enemyBag`
- Player bag initialization: unchanged

## Testing

New unit tests in `src/game/__tests__/bag.test.ts`:
- All stones in result have pip sum within `pipSumRange` for 90%+ of output (statistical)
- Exactly `floor(count × density)` stones have non-null elements
- Elements assigned are only from `config.elements`
- Returns exactly `count` stones
- All stone IDs are unique

New unit tests in `src/game/ai/__tests__/enemy-templates.test.ts`:
- `getEnemyBagConfig` returns correct config for each of the 6 known enemies
- Returns neutral fallback for unknown enemy name
