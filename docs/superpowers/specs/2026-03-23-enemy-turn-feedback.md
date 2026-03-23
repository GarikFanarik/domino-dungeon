# Enemy Turn Feedback — Spec

**Date:** 2026-03-23

## Goal

Give the player clear, step-by-step feedback during the enemy turn so they always understand why their HP changed. Currently the player just sees a 450ms hit flash and their HP drops silently.

---

## Decision

**Animated sequence, auto-advance, full breakdown.**

After the player clicks End Turn, an animated sequence plays in the combat area that steps through each event of the enemy turn one at a time. Each step fades in with a fixed `animation-delay` slot regardless of whether earlier steps were skipped. Delay slots are fixed positions, not re-indexed when a step is omitted. All 5 slot `<div>` elements are always rendered in the DOM; conditional steps set `visibility: hidden` on the element rather than skipping render, so `:nth-child` indices remain stable.

**`onDone` timing:** 2500ms for all attack paths (attack present, with or without DOT). Using a single unified timer for the attack path keeps the code simple; 2500ms is a comfortable buffer even when DOT slots are hidden. 1200ms for skip path with no DOT. 2200ms for skip path with DOT present (last DOT slot finishes by ~2.0s).

---

## Scenarios

### Normal attack (no armor)
1. "💀 Skeleton plays [5|3] → 8 dmg"
2. *(armor step omitted — `armorBlocked === 0`)*
3. "❤️ You take −8 HP"

### Normal attack + partial armor block
1. "💀 Skeleton plays [5|3] → 8 dmg"
2. "🛡 Armor absorbs −4 blocked"
3. "❤️ You take −4 HP"

### Normal attack + full armor absorption (`damage === 0`)
1. "💀 Skeleton plays [5|3] → 8 dmg"
2. "🛡 Armor absorbs −8 blocked"
3. *(HP step omitted — `damage === 0`; armor fully absorbed the hit)*

### Attack + enemy DOT ticks (player-applied burn/poison ticking on enemy)
Steps 1–3 as above (whichever apply), then:
4. "🔥 Your burn deals 3 to Skeleton"
5. "☠️ Your poison deals 2 to Skeleton"

Note: burn and poison tick on the **enemy** (from status effects the player applied). These are shown so the player sees their DoT working.

### Enemy stunned (skips attack)
- Enemy sprite at 45% opacity + grayscale
- Banner (slot 1, delay 0.1s): "⚡ Skeleton is stunned! Skips their attack this turn."
- DOT steps in slots 2 and 3 if applicable (delays 0.5s, 0.9s)
- `onDone` fires at 1200ms when no DOT; 2200ms when DOT steps are present (so animation completes before dismissal)

### Enemy frozen (skips attack)
- Same layout as stunned
- Banner text: "❄️ Skeleton is frozen! Skips their attack this turn."
- `onDone` fires at 1200ms when no DOT; 2200ms when DOT steps are present

---

## Architecture

### Server — `EndTurnResponse` additions (`src/types/api.ts`)

```typescript
enemyAttack?: {
  // Strip only { leftPip, rightPip } from GameStone — do not include id or element
  stone: { leftPip: number; rightPip: number };
  rawDamage: number;    // post-slow, pre-armor (= existing enemyAttackDamage variable)
  armorBlocked: number; // rawDamage - damage; 0 if no armor
  damage: number;       // net HP lost = armorResult.damageToDeal (change from current enemyAttackDamage)
  effects: string[];    // keep as-is for backwards compat; NOT used by EnemyTurnSequence
};
enemySkipped?: { reason: 'stunned' | 'frozen' }; // present when enemy skips; enemyAttack absent
dotDamage: { burn: number; poison: number };      // required (not optional); defaults { burn:0, poison:0 }
```

**`damage` field change:** Update the existing `damage: enemyAttackDamage` in the response to `damage: armorResult.damageToDeal`, so `rawDamage - armorBlocked === damage` always holds.

**`effects` field:** Set to `[]` always after the refactor. The field is kept in the type for backwards compatibility with any existing consumers, but `EnemyTurnSequence` does not use it and no display logic depends on it. The `enemyEffects` local variable in `combat.ts` becomes unused and should be removed.

### Server — `combat.ts` changes

**Enemy attack phase** (~lines 486–541):

1. `stone = { leftPip: enemyHand[0].leftPip, rightPip: enemyHand[0].rightPip }` (strip extra fields).
2. `rawDamage = enemyAttackDamage` (the post-slow, pre-armor variable already computed).
3. Call `applyArmor` as today → `armorResult`.
4. `armorBlocked = rawDamage - armorResult.damageToDeal`.

**Response construction block (~line 608–614) — rewrite conditionally:**

```typescript
// BEFORE (current):
enemyAttack: { damage: enemyAttackDamage, effects: enemyEffects }

// AFTER:
...(enemyWasSkipped
  ? { enemySkipped: { reason: enemySkipReason } }          // stunned | frozen
  : { enemyAttack: { stone, rawDamage, armorBlocked,
                     damage: netDamage,
                     effects: [] } }),
dotDamage: { burn: burnDamage, poison: poisonDamage },
```

Where `enemyWasSkipped` and `enemySkipReason` are set in the stun/freeze check that currently sets `'stunned'`/`'frozen'` into `enemyEffects`.

**Scoping note:** `stone`, `rawDamage`, `armorBlocked`, and `netDamage` (= `armorResult.damageToDeal`) are computed inside the attack branch. Declare them in outer scope with placeholder values (`let stone = ...; let rawDamage = 0; let armorBlocked = 0; let netDamage = 0;`) before the skip check, then assign inside the attack branch so they are in scope at the response construction site. TypeScript will accept this without a non-null assertion.

**DOT tick phase** (~lines 543–562):

5. Capture `burnDamage = enemy.status.burn` and `poisonDamage = enemy.status.poison` immediately before each respective `dealDamage` call. The EmberCore burn decay (`enemy.status.burn - 1`) happens in the surrounding `if` block after `dealDamage` returns, so reading before the call captures the correct tick amount.

### Client — `EnemyTurnData` local type in `CombatScreen.tsx`

```typescript
interface EnemyTurnData {
  enemyName: string;   // from EndTurnResponse.enemy.name
  attack?: {
    stone: { leftPip: number; rightPip: number };
    rawDamage: number;
    armorBlocked: number;
    damage: number;
  };
  skipReason?: 'stunned' | 'frozen';
  dotDamage: { burn: number; poison: number };
}
```

Populated in `handleEndTurn()`:
```typescript
setEnemyTurnData({
  enemyName: data.enemy.name,
  attack: data.enemyAttack
    ? { stone: data.enemyAttack.stone, rawDamage: data.enemyAttack.rawDamage,
        armorBlocked: data.enemyAttack.armorBlocked, damage: data.enemyAttack.damage }
    : undefined,
  skipReason: data.enemySkipped?.reason,
  dotDamage: data.dotDamage ?? { burn: 0, poison: 0 },
});
```

### Client — new `EnemyTurnSequence` component

**File:** `client/src/components/EnemyTurnSequence.tsx`

```typescript
interface Props {
  enemyName: string;
  attack?: {
    stone: { leftPip: number; rightPip: number };
    rawDamage: number;
    armorBlocked: number;
    damage: number;
    // effects intentionally omitted — display driven by skipReason
  };
  skipReason?: 'stunned' | 'frozen';
  dotDamage: { burn: number; poison: number };
  onDone: () => void;
}
```

- Timer logic: `const hasDot = dotDamage.burn > 0 || dotDamage.poison > 0; const duration = attack ? 2500 : hasDot ? 2200 : 1200; useEffect(() => { const t = setTimeout(onDone, duration); return () => clearTimeout(t); }, [])`.
- All 5 slot `<div className="seq-step">` elements are **always rendered**. Conditional steps set `style={{ visibility: 'hidden' }}` rather than being omitted, so `:nth-child` indices stay stable:
  - **Slot 1 (0.1s):** stone step (visible if `attack`) OR stun/freeze banner (visible if `skipReason`); hidden otherwise.
  - **Slot 2 (0.5s):** armor step — visible only if `attack && armorBlocked > 0`; hidden otherwise.
  - **Slot 3 (0.9s):** HP step — visible only if `attack && damage > 0`; hidden otherwise.
  - **Slot 4 (1.3s):** burn DOT — visible only if `dotDamage.burn > 0`; hidden otherwise.
  - **Slot 5 (1.7s):** poison DOT — visible only if `dotDamage.poison > 0`; hidden otherwise.

**File:** `client/src/components/EnemyTurnSequence.css`

```css
.seq-step:nth-child(1) { animation-delay: 0.1s; }
.seq-step:nth-child(2) { animation-delay: 0.5s; }
.seq-step:nth-child(3) { animation-delay: 0.9s; }
.seq-step:nth-child(4) { animation-delay: 1.3s; }
.seq-step:nth-child(5) { animation-delay: 1.7s; }
@keyframes step-in {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: none; }
}
.seq-step { opacity: 0; animation: step-in 0.3s ease forwards; }
```

Enemy domino tile: `background: rgba(160,30,30,0.35)`, `border: 1px solid rgba(220,80,80,0.55)`, `border-radius: 4px`, pip divider `width: 1px; background: rgba(220,80,80,0.4)`.

Stunned/frozen path: enemy sprite wrapper `opacity: 0.45; filter: grayscale(0.7)`.

### Client — `CombatScreen.tsx` integration

- Add `EnemyTurnData` local type (above) and `const [enemyTurnData, setEnemyTurnData] = useState<EnemyTurnData | null>(null)`.
- In `handleEndTurn()`, after receiving the response, call `setEnemyTurnData(...)`.
- While `enemyTurnData !== null`, render `<EnemyTurnSequence>` as an overlay in the combat area (above chain/hand, below HUD sprites).
- `onDone` → `setEnemyTurnData(null)`.
- Existing `playerHit`/`enemyHit` flash states fire unchanged alongside the sequence.

---

## Files Changed

| File | Change |
|------|--------|
| `src/types/api.ts` | Extend `EndTurnResponse`: add `stone`, `rawDamage`, `armorBlocked` to `enemyAttack`; change `damage` to net HP lost; add required `dotDamage`; add `enemySkipped` |
| `server/src/routes/combat.ts` | Capture `stone` (leftPip/rightPip only), `rawDamage`, `armorBlocked`; rewrite response construction block conditionally; capture DOT damage; populate `dotDamage` |
| `client/src/components/EnemyTurnSequence.tsx` | **New** |
| `client/src/components/EnemyTurnSequence.css` | **New** |
| `client/src/screens/CombatScreen.tsx` | Add `EnemyTurnData` type, `enemyTurnData` state, `<EnemyTurnSequence>` overlay |

---

## Testing

All tests use `vi.useFakeTimers()` / `vi.advanceTimersByTime()`.

### `EnemyTurnSequence.test.tsx` (new)

**Fixtures:**
```typescript
const normalAttack = { stone: { leftPip: 5, rightPip: 3 }, rawDamage: 8, armorBlocked: 4, damage: 4 };
const noArmorAttack = { stone: { leftPip: 5, rightPip: 3 }, rawDamage: 8, armorBlocked: 0, damage: 8 };
const fullAbsorbAttack = { stone: { leftPip: 5, rightPip: 3 }, rawDamage: 8, armorBlocked: 8, damage: 0 };
const dotDamage = { burn: 3, poison: 2 };
const zeroDot = { burn: 0, poison: 0 };
```

- Renders stone pips, armor step, HP step when `normalAttack` + `dotDamage`.
- Omits armor step when `noArmorAttack` (`armorBlocked === 0`).
- Omits HP step when `fullAbsorbAttack` (`damage === 0`).
- Omits DOT steps when `zeroDot`.
- Renders stun banner (not stone/armor/HP steps) when `attack` absent and `skipReason = 'stunned'`.
- Renders frozen banner text when `skipReason = 'frozen'`.
- `onDone` called after 2500ms for normal attack: `vi.advanceTimersByTime(2500)`.
- `onDone` NOT called at 2499ms.
- `onDone` called after 1200ms for stunned path with `zeroDot`.
- `onDone` called after 2200ms for stunned path with `dotDamage` present; NOT called at 2199ms.
- All 5 slot divs present in the DOM regardless of which steps are visible (check via `.seq-step` query — always returns 5 elements).

### Server tests (existing `combat` test file)

- `end-turn` response includes `stone.leftPip`, `stone.rightPip`, `rawDamage`, `armorBlocked`, `damage` (= net) when enemy attacks.
- `rawDamage - armorBlocked === damage` in response.
- `dotDamage.burn > 0` when enemy has burn stacks.
- `dotDamage` present (with `{ burn: 0, poison: 0 }`) even when no DOT.
- `enemySkipped: { reason: 'stunned' }` and no `enemyAttack` when enemy is stunned.
- `enemySkipped: { reason: 'frozen' }` and no `enemyAttack` when enemy is frozen.

### All existing 108 tests remain green.

---

## Out of Scope

- Sound effects
- Enemy "intent" preview (showing next-turn attack before the player acts)
- Animated sprite movement (enemy lunging toward player)
