# Enemy Turn Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display an animated step-by-step sequence after the enemy's turn so the player always understands what happened to their HP.

**Architecture:** Three layers — extend the server `EndTurnResponse` type with structured attack data, create a new `EnemyTurnSequence` React component that plays a staggered 5-slot animation, then wire it into `CombatScreen` as an overlay that auto-dismisses after a fixed timeout.

**Tech Stack:** TypeScript, Express (server), React 18 + Vitest + @testing-library/react (client), supertest + Jest (server tests)

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `src/types/api.ts` | Modify | Extend `EndTurnResponse` with `stone`, `rawDamage`, `armorBlocked`, `dotDamage`, `enemySkipped`; change `damage` semantics |
| `server/src/routes/combat.ts` | Modify | Capture stone/damage vars in outer scope; rewrite response block conditionally; capture DOT damage before `dealDamage` |
| `server/src/__tests__/combat.test.ts` | Modify | Add end-turn response shape tests with seeded Redis session |
| `client/src/components/EnemyTurnSequence.tsx` | Create | New animated sequence component |
| `client/src/components/EnemyTurnSequence.css` | Create | Step-in keyframe animation with fixed delay slots |
| `client/src/components/__tests__/EnemyTurnSequence.test.tsx` | Create | Unit tests with fake timers |
| `client/src/screens/CombatScreen.tsx` | Modify | Add `EnemyTurnData` state, populate from response, render overlay |

---

## Task 1: Extend EndTurnResponse type and server combat logic

**Files:**
- Modify: `src/types/api.ts:54-63`
- Modify: `server/src/routes/combat.ts:486-614`
- Modify: `server/src/__tests__/combat.test.ts`

### Step 1.1: Write failing server tests

Add a new `describe` block in `server/src/__tests__/combat.test.ts`. The tests seed a combat session directly into the Redis mock store, then POST to end-turn and assert the response shape.

The Redis mock in `combat.test.ts` uses an internal `Map` that is not exported. You need to switch to the same pattern as `runs.test.ts` where the store is declared in the test file and the mock reads from it. Replace the existing mock at the top of `combat.test.ts`:

```typescript
const redisStore = new Map<string, string>();
jest.mock('../../../src/lib/redis', () => ({
  __esModule: true,
  default: {
    get: jest.fn(async (key: string) => redisStore.get(key) ?? null),
    set: jest.fn(async (key: string, value: string) => {
      redisStore.set(key, value);
      return 'OK';
    }),
    del: jest.fn(async () => 1),
    on: jest.fn(),
  },
}));
```

Then add this helper and test block **inside** `describe('Combat API', ...)`:

```typescript
function makeSession(overrides: Partial<{
  enemyStatus: { burn: number; slow: number; frozen: boolean; stunned: boolean; poison: number };
  playerHp: number;
  playerArmor: number;
}> = {}) {
  return {
    userId: 'test-et-run',
    runId: 'test-et-run',
    enemyId: 'Skeleton',
    enemyHp: 50,
    enemyMaxHp: 80,
    enemyStatus: { burn: 0, slow: 0, frozen: false, stunned: false, poison: 0,
      ...(overrides.enemyStatus ?? {}) },
    hand: [],
    bag: [],
    chain: { stones: [], leftOpen: null, rightOpen: null },
    turnNumber: 1,
    swapsUsed: 0,
    swapsPerTurn: 1,
    playerHp: overrides.playerHp ?? 80,
    playerMaxHp: 80,
    playerArmor: overrides.playerArmor ?? 0,
    playerGold: 0,
    relics: [],
  };
}

describe('POST /api/run/:runId/combat/end-turn — response shape', () => {
  beforeEach(() => redisStore.clear());

  it('includes stone, rawDamage, armorBlocked, damage, dotDamage when enemy attacks', async () => {
    redisStore.set('combat:test-et-run', JSON.stringify(makeSession()));
    const res = await request(app).post('/api/run/test-et-run/combat/end-turn').send({});
    expect(res.status).toBe(200);
    expect(res.body.enemyAttack).toBeDefined();
    expect(res.body.enemyAttack.stone).toEqual({
      leftPip: expect.any(Number),
      rightPip: expect.any(Number),
    });
    expect(res.body.enemyAttack.rawDamage).toBeGreaterThanOrEqual(0);
    expect(res.body.enemyAttack.armorBlocked).toBeGreaterThanOrEqual(0);
    expect(res.body.enemyAttack.damage).toBeGreaterThanOrEqual(0);
    expect(res.body.enemyAttack.rawDamage - res.body.enemyAttack.armorBlocked).toBe(res.body.enemyAttack.damage);
    expect(res.body.dotDamage).toEqual({ burn: 0, poison: 0 });
  });

  it('armor reduces damage: armorBlocked = min(armor, rawDamage)', async () => {
    redisStore.set('combat:test-et-run', JSON.stringify(makeSession({ playerArmor: 99 })));
    const res = await request(app).post('/api/run/test-et-run/combat/end-turn').send({});
    expect(res.status).toBe(200);
    expect(res.body.enemyAttack.damage).toBe(0);
    expect(res.body.enemyAttack.armorBlocked).toBe(res.body.enemyAttack.rawDamage);
  });

  it('dotDamage.burn > 0 when enemy has burn stacks', async () => {
    redisStore.set('combat:test-et-run',
      JSON.stringify(makeSession({ enemyStatus: { burn: 3, slow: 0, frozen: false, stunned: false, poison: 0 } })));
    const res = await request(app).post('/api/run/test-et-run/combat/end-turn').send({});
    expect(res.body.dotDamage.burn).toBe(3);
  });

  it('returns enemySkipped with reason stunned and no enemyAttack', async () => {
    redisStore.set('combat:test-et-run',
      JSON.stringify(makeSession({ enemyStatus: { burn: 0, slow: 0, frozen: false, stunned: true, poison: 0 } })));
    const res = await request(app).post('/api/run/test-et-run/combat/end-turn').send({});
    expect(res.body.enemySkipped).toEqual({ reason: 'stunned' });
    expect(res.body.enemyAttack).toBeUndefined();
    expect(res.body.dotDamage).toBeDefined();
  });

  it('returns enemySkipped with reason frozen and no enemyAttack', async () => {
    redisStore.set('combat:test-et-run',
      JSON.stringify(makeSession({ enemyStatus: { burn: 0, slow: 0, frozen: true, stunned: false, poison: 0 } })));
    const res = await request(app).post('/api/run/test-et-run/combat/end-turn').send({});
    expect(res.body.enemySkipped).toEqual({ reason: 'frozen' });
    expect(res.body.enemyAttack).toBeUndefined();
  });
});
```

- [ ] **Step 1.2: Run tests to verify they fail**

```bash
cd "server" && npx jest --testPathPattern="combat.test" --no-coverage 2>&1 | tail -30
```

Expected: 5 new tests fail — `enemyAttack.stone` is `undefined`, `dotDamage` is `undefined`, `enemySkipped` is `undefined`.

- [ ] **Step 1.3: Extend `EndTurnResponse` in `src/types/api.ts`**

Replace line 58 (`enemyAttack?: { damage: number; effects: string[] };`) with:

```typescript
enemyAttack?: {
  stone: { leftPip: number; rightPip: number };
  rawDamage: number;
  armorBlocked: number;
  damage: number;       // net HP lost = rawDamage - armorBlocked
  effects: string[];    // kept for backwards compat; always []
};
enemySkipped?: { reason: 'stunned' | 'frozen' };
dotDamage: { burn: number; poison: number };   // required; defaults { burn:0, poison:0 }
```

- [ ] **Step 1.4: Update `server/src/routes/combat.ts`**

**A. Hoist capture variables above the enemy attack block (around line 487). This also removes `enemyEffects` entirely — it becomes unused after Part B.**

Replace:
```typescript
  // 5. Enemy attacks (only if not stunned)
  let enemyAttackDamage = 0;
  const enemyEffects: string[] = [];
```
With:
```typescript
  // 5. Enemy attacks (only if not stunned)
  let enemyAttackDamage = 0;
  let stone: { leftPip: number; rightPip: number } = { leftPip: 0, rightPip: 0 };
  let rawDamage = 0;
  let armorBlocked = 0;
  let netDamage = 0;
  let enemyWasSkipped = false;
  let enemySkipReason: 'stunned' | 'frozen' = 'stunned';
```

**B. Inside the attack branch, capture stone/damage values. Replace the attack block content (lines ~491–531):**

```typescript
  if (!enemy.status.stunned && !enemy.status.frozen) {
    const ai = new EnemyAI();
    const enemyHand: GameStone[] = [
      {
        id: 'e1',
        leftPip: Math.min(6, Math.floor(enemy.hp.current / 10)),
        rightPip: Math.min(6, Math.floor(enemy.hp.current / 5)),
        element: null,
      },
    ];
    stone = { leftPip: enemyHand[0].leftPip, rightPip: enemyHand[0].rightPip };
    const attack = ai.buildAttack(enemyHand, EnemyType.Normal);

    // FrostbiteRing: each slow stack reduces enemy damage by 30% instead of 20%
    const slowPct = relics.includes(RelicType.FrostbiteRing) ? 0.3 : 0.2;
    const slowMultiplier = getSlowDamageMultiplier(enemy, slowPct);
    enemyAttackDamage = Math.floor(attack.damage * slowMultiplier);
    rawDamage = enemyAttackDamage;

    // Apply armor first
    const armorResult = applyArmor(enemyAttackDamage, playerState.armor);
    playerState.armor = armorResult.armorRemaining;
    armorBlocked = rawDamage - armorResult.damageToDeal;
    netDamage = armorResult.damageToDeal;

    // Deal remaining damage to player
    if (armorResult.damageToDeal > 0) {
      dealDamage(playerState, armorResult.damageToDeal);

      // PhoenixFeather: survive a lethal hit once per run, restore 30% max HP
      if (relics.includes(RelicType.PhoenixFeather) && isDead(playerState)) {
        const phoenixState = { phoenixUsed: session.phoenixUsed ?? false };
        const restored = applyPhoenixFeather(playerState.hp.current, playerState.hp.max, phoenixState);
        if (restored > 0) {
          playerState.hp.current = restored;
          session.phoenixUsed = true;
        }
      }

      // CurseOfGreed: lose 1 gold when hit
      if (relics.includes(RelicType.CurseOfGreed)) {
        const goldLost = applyCurseOfGreed(0, 'hit');
        session.playerGold = Math.max(0, (session.playerGold ?? 0) - goldLost);
        playerState.gold = session.playerGold;
      }
    }
  } else {
    enemyWasSkipped = true;
    if (enemy.status.stunned) {
      enemySkipReason = 'stunned';
      enemy.status.stunned = false;
    } else if (enemy.status.frozen) {
      enemySkipReason = 'frozen';
      enemy.status.frozen = false;
    }
  }
```

**C. Capture DOT amounts before each `dealDamage` call in the DOT tick block (lines ~543–557).**

Replace:
```typescript
  // Tick burn — EmberCore: burn stacks don't decay
  if (enemy.status.burn > 0) {
    dealDamage(enemy, enemy.status.burn);
    if (!relics.includes(RelicType.EmberCore)) {
      enemy.status.burn = Math.max(0, enemy.status.burn - 1);
    }
  }

  // Tick poison — VenomGland: poison stacks don't decay
  if (enemy.status.poison > 0) {
    dealDamage(enemy, enemy.status.poison);
    if (!relics.includes(RelicType.VenomGland)) {
      enemy.status.poison = Math.max(0, enemy.status.poison - 1);
    }
  }
```
With:
```typescript
  // Tick burn — EmberCore: burn stacks don't decay
  let burnDamage = 0;
  if (enemy.status.burn > 0) {
    burnDamage = enemy.status.burn;  // capture before dealDamage
    dealDamage(enemy, burnDamage);
    if (!relics.includes(RelicType.EmberCore)) {
      enemy.status.burn = Math.max(0, enemy.status.burn - 1);
    }
  }

  // Tick poison — VenomGland: poison stacks don't decay
  let poisonDamage = 0;
  if (enemy.status.poison > 0) {
    poisonDamage = enemy.status.poison;  // capture before dealDamage
    dealDamage(enemy, poisonDamage);
    if (!relics.includes(RelicType.VenomGland)) {
      enemy.status.poison = Math.max(0, enemy.status.poison - 1);
    }
  }
```

**D. Rewrite the response construction block (lines ~608–614).**

Replace:
```typescript
  const response: EndTurnResponse = {
    playerState,
    enemy,
    combatResult,
    enemyAttack: { damage: enemyAttackDamage, effects: enemyEffects },
    hand: session.hand.map(toGameStone),
  };
```
With:
```typescript
  const response: EndTurnResponse = {
    playerState,
    enemy,
    combatResult,
    ...(enemyWasSkipped
      ? { enemySkipped: { reason: enemySkipReason } }
      : { enemyAttack: { stone, rawDamage, armorBlocked, damage: netDamage, effects: [] } }),
    dotDamage: { burn: burnDamage, poison: poisonDamage },
    hand: session.hand.map(toGameStone),
  };
```

- [ ] **Step 1.5: Run tests to verify they pass**

```bash
cd "server" && npx jest --testPathPattern="combat.test" --no-coverage 2>&1 | tail -30
```

Expected: all tests in `combat.test.ts` pass (existing 4 + new 5 = 9 total).

- [ ] **Step 1.6: Run the full server test suite**

```bash
cd "server" && npx jest --no-coverage 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 1.7: Commit**

```bash
git add src/types/api.ts server/src/routes/combat.ts server/src/__tests__/combat.test.ts
git commit -m "feat: extend EndTurnResponse with stone, armorBlocked, dotDamage, enemySkipped"
```

---

## Task 2: Create EnemyTurnSequence component

**Files:**
- Create: `client/src/components/EnemyTurnSequence.tsx`
- Create: `client/src/components/EnemyTurnSequence.css`
- Create: `client/src/components/__tests__/EnemyTurnSequence.test.tsx`

> **Note:** The `client` package uses Vitest (not Jest). Run client tests with `cd client && npx vitest run`.

- [ ] **Step 2.1: Write failing component tests**

Create `client/src/components/__tests__/EnemyTurnSequence.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnemyTurnSequence } from '../EnemyTurnSequence';

const normalAttack  = { stone: { leftPip: 5, rightPip: 3 }, rawDamage: 8, armorBlocked: 4, damage: 4 };
const noArmorAttack = { stone: { leftPip: 5, rightPip: 3 }, rawDamage: 8, armorBlocked: 0, damage: 8 };
const fullAbsorb    = { stone: { leftPip: 5, rightPip: 3 }, rawDamage: 8, armorBlocked: 8, damage: 0 };
const dotDamage     = { burn: 3, poison: 2 };
const zeroDot       = { burn: 0, poison: 0 };

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('EnemyTurnSequence', () => {
  it('always renders exactly 5 seq-step divs', () => {
    const { container } = render(
      <EnemyTurnSequence enemyName="Skeleton" attack={normalAttack} dotDamage={zeroDot} onDone={vi.fn()} />
    );
    expect(container.querySelectorAll('.seq-step')).toHaveLength(5);
  });

  it('renders stone pips and armor step and HP step for normalAttack', () => {
    render(<EnemyTurnSequence enemyName="Skeleton" attack={normalAttack} dotDamage={zeroDot} onDone={vi.fn()} />);
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText(/4 blocked/)).toBeTruthy();
    expect(screen.getByText(/−4 HP/)).toBeTruthy();
  });

  it('armor step is visibility:hidden when armorBlocked === 0', () => {
    const { container } = render(
      <EnemyTurnSequence enemyName="Skeleton" attack={noArmorAttack} dotDamage={zeroDot} onDone={vi.fn()} />
    );
    const steps = container.querySelectorAll('.seq-step');
    expect((steps[1] as HTMLElement).style.visibility).toBe('hidden');
  });

  it('HP step is visibility:hidden when damage === 0', () => {
    const { container } = render(
      <EnemyTurnSequence enemyName="Skeleton" attack={fullAbsorb} dotDamage={zeroDot} onDone={vi.fn()} />
    );
    const steps = container.querySelectorAll('.seq-step');
    expect((steps[2] as HTMLElement).style.visibility).toBe('hidden');
  });

  it('DOT steps are visibility:hidden when zeroDot', () => {
    const { container } = render(
      <EnemyTurnSequence enemyName="Skeleton" attack={normalAttack} dotDamage={zeroDot} onDone={vi.fn()} />
    );
    const steps = container.querySelectorAll('.seq-step');
    expect((steps[3] as HTMLElement).style.visibility).toBe('hidden');
    expect((steps[4] as HTMLElement).style.visibility).toBe('hidden');
  });

  it('renders burn and poison DOT when dotDamage present', () => {
    render(<EnemyTurnSequence enemyName="Skeleton" attack={normalAttack} dotDamage={dotDamage} onDone={vi.fn()} />);
    expect(screen.getByText(/3.*Skeleton|burn.*3/i)).toBeTruthy();
    expect(screen.getByText(/2.*Skeleton|poison.*2/i)).toBeTruthy();
  });

  it('renders stun banner (not attack steps) when skipReason=stunned', () => {
    const { container } = render(
      <EnemyTurnSequence enemyName="Skeleton" skipReason="stunned" dotDamage={zeroDot} onDone={vi.fn()} />
    );
    expect(screen.getByText(/stunned/i)).toBeTruthy();
    const steps = container.querySelectorAll('.seq-step');
    // slots 2 and 3 (armor, HP) hidden
    expect((steps[1] as HTMLElement).style.visibility).toBe('hidden');
    expect((steps[2] as HTMLElement).style.visibility).toBe('hidden');
  });

  it('renders frozen banner text when skipReason=frozen', () => {
    render(<EnemyTurnSequence enemyName="Skeleton" skipReason="frozen" dotDamage={zeroDot} onDone={vi.fn()} />);
    expect(screen.getByText(/frozen/i)).toBeTruthy();
  });

  it('onDone called after 2500ms for normal attack', () => {
    const onDone = vi.fn();
    render(<EnemyTurnSequence enemyName="Skeleton" attack={normalAttack} dotDamage={zeroDot} onDone={onDone} />);
    vi.advanceTimersByTime(2499);
    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('onDone called after 1200ms for stunned with no DOT', () => {
    const onDone = vi.fn();
    render(<EnemyTurnSequence enemyName="Skeleton" skipReason="stunned" dotDamage={zeroDot} onDone={onDone} />);
    vi.advanceTimersByTime(1200);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('onDone called after 2200ms for stunned with DOT', () => {
    const onDone = vi.fn();
    render(<EnemyTurnSequence enemyName="Skeleton" skipReason="stunned" dotDamage={dotDamage} onDone={onDone} />);
    vi.advanceTimersByTime(2199);
    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2.2: Run tests to verify they fail**

```bash
cd "client" && npx vitest run --reporter=verbose src/components/__tests__/EnemyTurnSequence.test.tsx 2>&1 | tail -20
```

Expected: FAIL — `EnemyTurnSequence` does not exist.

- [ ] **Step 2.3: Create `EnemyTurnSequence.css`**

Create `client/src/components/EnemyTurnSequence.css`:

```css
@keyframes step-in {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: none; }
}

.seq-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  opacity: 0;
  animation: step-in 0.3s ease forwards;
}

.seq-step:nth-child(1) { animation-delay: 0.1s; }
.seq-step:nth-child(2) { animation-delay: 0.5s; }
.seq-step:nth-child(3) { animation-delay: 0.9s; }
.seq-step:nth-child(4) { animation-delay: 1.3s; }
.seq-step:nth-child(5) { animation-delay: 1.7s; }

.seq-icon { font-size: 17px; flex-shrink: 0; width: 22px; text-align: center; }
.seq-text { font-size: 13px; color: #a08060; flex: 1; }
.seq-text b { color: #e8d8b0; }
.seq-val { font-size: 14px; font-weight: 700; flex-shrink: 0; }
.seq-val--base  { color: #ff9966; }
.seq-val--block { color: #aaccff; }
.seq-val--net   { color: #ff6666; font-size: 17px; }
.seq-val--dot   { color: #ff7733; }

/* Enemy domino tile */
.seq-domino {
  display: inline-flex;
  align-items: center;
  background: rgba(160, 30, 30, 0.35);
  border: 1px solid rgba(220, 80, 80, 0.55);
  border-radius: 4px;
  overflow: hidden;
  font-size: 14px;
  font-weight: 800;
  color: #e8d8b0;
  padding: 2px;
  margin-left: 6px;
  vertical-align: middle;
}
.seq-domino__pip {
  width: 26px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.seq-domino__div {
  width: 1px;
  height: 16px;
  background: rgba(220, 80, 80, 0.4);
  flex-shrink: 0;
}

/* Skip banner */
.seq-skip-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(40, 30, 0, 0.7);
  border: 1px solid rgba(255, 200, 40, 0.4);
  border-radius: 6px;
  animation: step-in 0.35s ease forwards;
  opacity: 0;
}
.seq-skip-icon { font-size: 24px; }
.seq-skip-text { font-size: 13px; }
.seq-skip-text b { color: #ffd066; }
.seq-skip-text span { color: #a08060; font-size: 11px; display: block; margin-top: 2px; }

/* Stunned/frozen enemy sprite */
.seq-enemy--skipped {
  opacity: 0.45;
  filter: grayscale(0.7);
}

/* Overlay wrapper */
.enemy-turn-sequence {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 6px 18px 16px;
}
```

- [ ] **Step 2.4: Create `EnemyTurnSequence.tsx`**

Create `client/src/components/EnemyTurnSequence.tsx`:

```tsx
import { useEffect } from 'react';
import './EnemyTurnSequence.css';

interface Props {
  enemyName: string;
  attack?: {
    stone: { leftPip: number; rightPip: number };
    rawDamage: number;
    armorBlocked: number;
    damage: number;
  };
  skipReason?: 'stunned' | 'frozen';
  dotDamage: { burn: number; poison: number };
  onDone: () => void;
}

export function EnemyTurnSequence({ enemyName, attack, skipReason, dotDamage, onDone }: Props) {
  const hasDot = dotDamage.burn > 0 || dotDamage.poison > 0;
  const duration = attack ? 2500 : hasDot ? 2200 : 1200;

  useEffect(() => {
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Slot 1: stone step (if attack) OR skip banner (if skipReason)
  const slot1Visible = !!(attack || skipReason);
  const slot2Visible = !!(attack && attack.armorBlocked > 0);
  const slot3Visible = !!(attack && attack.damage > 0);
  const slot4Visible = dotDamage.burn > 0;
  const slot5Visible = dotDamage.poison > 0;

  function hide(visible: boolean): React.CSSProperties {
    return visible ? {} : { visibility: 'hidden' };
  }

  return (
    <div className="enemy-turn-sequence">
      {/* Slot 1 */}
      <div className="seq-step" style={hide(slot1Visible)}>
        {attack ? (
          <>
            <div className="seq-icon">💀</div>
            <div className="seq-text">
              {enemyName} plays
              <span className="seq-domino">
                <span className="seq-domino__pip">{attack.stone.leftPip}</span>
                <span className="seq-domino__div" />
                <span className="seq-domino__pip">{attack.stone.rightPip}</span>
              </span>
            </div>
            <div className="seq-val seq-val--base">{attack.rawDamage} dmg</div>
          </>
        ) : skipReason ? (
          <>
            <div className="seq-icon">{skipReason === 'stunned' ? '⚡' : '❄️'}</div>
            <div className="seq-text">
              <b>{enemyName} is {skipReason}!</b>
              <span>Skips their attack this turn.</span>
            </div>
          </>
        ) : null}
      </div>

      {/* Slot 2: armor */}
      <div className="seq-step" style={hide(slot2Visible)}>
        <div className="seq-icon">🛡</div>
        <div className="seq-text">Your armor absorbs</div>
        <div className="seq-val seq-val--block">−{attack?.armorBlocked} blocked</div>
      </div>

      {/* Slot 3: HP taken */}
      <div className="seq-step" style={hide(slot3Visible)}>
        <div className="seq-icon">❤️</div>
        <div className="seq-text"><b>You take</b></div>
        <div className="seq-val seq-val--net">−{attack?.damage} HP</div>
      </div>

      {/* Slot 4: burn DOT */}
      <div className="seq-step" style={hide(slot4Visible)}>
        <div className="seq-icon">🔥</div>
        <div className="seq-text">Your burn deals {dotDamage.burn} to {enemyName}</div>
        <div className="seq-val seq-val--dot">−{dotDamage.burn} HP</div>
      </div>

      {/* Slot 5: poison DOT */}
      <div className="seq-step" style={hide(slot5Visible)}>
        <div className="seq-icon">☠️</div>
        <div className="seq-text">Your poison deals {dotDamage.poison} to {enemyName}</div>
        <div className="seq-val seq-val--dot">−{dotDamage.poison} HP</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2.5: Run tests to verify they pass**

```bash
cd "client" && npx vitest run --reporter=verbose src/components/__tests__/EnemyTurnSequence.test.tsx 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 2.6: Run the full client test suite**

```bash
cd "client" && npx vitest run 2>&1 | tail -20
```

Expected: all tests pass (108+ green).

- [ ] **Step 2.7: Commit**

```bash
git add client/src/components/EnemyTurnSequence.tsx client/src/components/EnemyTurnSequence.css client/src/components/__tests__/EnemyTurnSequence.test.tsx
git commit -m "feat: add EnemyTurnSequence animated overlay component"
```

---

## Task 3: Integrate EnemyTurnSequence into CombatScreen

**Files:**
- Modify: `client/src/screens/CombatScreen.tsx`

- [ ] **Step 3.1: Add `EnemyTurnData` interface and state**

In `client/src/screens/CombatScreen.tsx`, add the interface and state. Add after the existing `useState` imports at the top of the component (after line ~123):

```tsx
interface EnemyTurnData {
  enemyName: string;
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

Add the state declaration with the other `useState` calls:

```tsx
const [enemyTurnData, setEnemyTurnData] = useState<EnemyTurnData | null>(null);
```

- [ ] **Step 3.2: Add import for EnemyTurnSequence**

At the top of `CombatScreen.tsx`, add:

```tsx
import { EnemyTurnSequence } from '../components/EnemyTurnSequence';
```

- [ ] **Step 3.3: Populate `enemyTurnData` in `handleEndTurn`**

Inside the `else` branch of `handleEndTurn` (the `'ongoing'` path, around line 250), add `setEnemyTurnData(...)` after the existing hit flash calls:

```tsx
setEnemyTurnData({
  enemyName: data.enemy.name,
  attack: data.enemyAttack
    ? {
        stone: data.enemyAttack.stone,
        rawDamage: data.enemyAttack.rawDamage,
        armorBlocked: data.enemyAttack.armorBlocked,
        damage: data.enemyAttack.damage,
      }
    : undefined,
  skipReason: data.enemySkipped?.reason,
  dotDamage: data.dotDamage ?? { burn: 0, poison: 0 },
});
```

- [ ] **Step 3.4: Render the overlay inside the battlefield div**

In the JSX, inside the `combat-battlefield` div (around line 355), add the `EnemyTurnSequence` overlay after the two sprite containers:

```tsx
{enemyTurnData && (
  <EnemyTurnSequence
    enemyName={enemyTurnData.enemyName}
    attack={enemyTurnData.attack}
    skipReason={enemyTurnData.skipReason}
    dotDamage={enemyTurnData.dotDamage}
    onDone={() => setEnemyTurnData(null)}
  />
)}
```

- [ ] **Step 3.5: Run full client test suite**

```bash
cd "client" && npx vitest run 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 3.6: Commit**

```bash
git add client/src/screens/CombatScreen.tsx
git commit -m "feat: show EnemyTurnSequence overlay in CombatScreen after end turn"
```

---

## Task 4: Verify and push

- [ ] **Step 4.1: Run all tests**

```bash
cd "server" && npx jest --no-coverage 2>&1 | tail -10
cd "client" && npx vitest run 2>&1 | tail -10
```

Expected: both pass green.

- [ ] **Step 4.2: TypeScript build check**

```bash
cd "server" && npx tsc --noEmit 2>&1
cd "client" && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 4.3: Push**

```bash
git push
```
