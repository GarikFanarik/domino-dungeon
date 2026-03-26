# Relic UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve relic visuals across three contexts — selection screen (140px hero image), shop (72px horizontal card), and inventory bar (52px square with rarity stripe) — to match state-of-the-art deckbuilder quality.

**Architecture:** Extract the image-path lookup into a shared `relicImage.ts` utility. Redesign `RelicIcon` to be bar-only (52px square, rarity stripe, no text labels). Replace `RelicIcon` usage in `RelicSelectionScreen` and `ShopScreen` with direct `<img>` elements at the appropriate sizes.

**Tech Stack:** React 18, TypeScript, Vitest + React Testing Library, CSS (no CSS-in-JS, no Tailwind)

---

## File Map

| File | Status | Role |
|------|--------|------|
| `client/src/utils/relicImage.ts` | **Create** | Single source of truth for relic image paths |
| `client/src/components/RelicIcon.tsx` | Modify | Remove text labels; import from utils |
| `client/src/components/RelicIcon.css` | Modify | 52px square + rarity stripe style |
| `client/src/screens/RelicSelectionScreen.tsx` | Modify | Replace `<RelicIcon>` with 140px `<img>` |
| `client/src/screens/RelicSelectionScreen.css` | Modify | Add `.relic-card__art` styles |
| `client/src/screens/ShopScreen.tsx` | Modify | Replace `<RelicIcon>` with 72px `<img>`, horizontal layout |
| `client/src/screens/ShopScreen.css` | Modify | Add horizontal relic card styles |
| `client/src/__tests__/relicImage.test.ts` | **Create** | Tests for the new utility |
| `client/src/__tests__/RelicIcon.test.tsx` | Modify | Remove label assertions; add rarity-class + img assertions |
| `client/src/__tests__/RelicBar.test.tsx` | Modify | Remove name-text assertions; check icon count |
| `client/src/__tests__/RelicSelectionScreen.test.tsx` | Modify | Fix mock IDs; add img count assertion |
| `client/src/__tests__/ShopScreen.test.tsx` | Modify | Add relicId to mock; add img assertion |

---

## Task 1: Create `relicImage` utility

**Files:**
- Create: `client/src/utils/relicImage.ts`
- Create: `client/src/__tests__/relicImage.test.ts`

- [ ] **Step 1.1: Write the failing test**

Create `client/src/__tests__/relicImage.test.ts`:

```typescript
import { relicImage, RELIC_IMAGES } from '../utils/relicImage';

describe('relicImage', () => {
  it('returns the correct path for a known relic type', () => {
    expect(relicImage('worn-pouch')).toBe('/assets/relics/common/coin_purse.png');
  });

  it('returns undefined for an unknown relic type', () => {
    expect(relicImage('not-a-relic')).toBeUndefined();
  });

  it('exports RELIC_IMAGES as a record', () => {
    expect(RELIC_IMAGES['phoenix-feather']).toBe('/assets/relics/epic/fire_feather.png');
  });

  it('covers all 21 relics', () => {
    expect(Object.keys(RELIC_IMAGES)).toHaveLength(21);
  });
});
```

- [ ] **Step 1.2: Run test to confirm it fails**

```bash
cd "C:\Users\nicka\repo\Domino Game v2"
npm test -- --testPathPattern="relicImage" 2>&1 | tail -10
```

Expected: FAIL — "Cannot find module '../utils/relicImage'".

- [ ] **Step 1.3: Create the utility**

Create `client/src/utils/relicImage.ts`:

```typescript
export const RELIC_IMAGES: Record<string, string> = {
  // Common
  'worn-pouch':          '/assets/relics/common/coin_purse.png',
  'lucky-pip':           '/assets/relics/common/golden_domino.png',
  'cracked-shield':      '/assets/relics/common/iron_shield.png',
  'travelers-boots':     '/assets/relics/common/worn_boots.png',
  'pebble-charm':        '/assets/relics/common/river_pebble.png',
  // Rare
  'ember-core':          '/assets/relics/rare/red_crystal_core.png',
  'frostbite-ring':      '/assets/relics/rare/Freeze_ring.png',
  'storm-amulet':        '/assets/relics/rare/dark_amulet.png',
  'venom-gland':         '/assets/relics/rare/green_sac.png',
  'iron-skin':           '/assets/relics/rare/rough_skin.png',
  // Epic
  'phoenix-feather':     '/assets/relics/epic/fire_feather.png',
  'chain-masters-glove': '/assets/relics/epic/combat_glove.png',
  'voltaic-lens':        '/assets/relics/epic/voltaic_lens.png',
  'glacial-heart':       '/assets/relics/epic/lucid-origin_A_heart-shaped_block_of_deep_blue_ice_with_a_frozen_pulse_visible_inside_crystal-0-Photoroom.png',
  'poison-tome':         '/assets/relics/epic/grimoire.png',
  // Legendary
  'domino-crown':        '/assets/relics/legendary/Domino_Crown.png',
  'elemental-prism':     '/assets/relics/legendary/Elemental_Prism.png',
  'infinite-bag':        '/assets/relics/legendary/Infinite_Bag.png',
  'blood-pact':          '/assets/relics/legendary/Blood_Pact.png',
  'the-last-stone':      '/assets/relics/legendary/THE_LAST_STONE.png',
  'curse-of-greed':      '/assets/relics/legendary/Curse_of_Greed.png',
};

export function relicImage(type: string): string | undefined {
  return RELIC_IMAGES[type];
}
```

- [ ] **Step 1.4: Run test to confirm it passes**

```bash
npm test -- --testPathPattern="relicImage" 2>&1 | tail -10
```

Expected: PASS — 4 tests.

- [ ] **Step 1.5: Commit**

```bash
git add client/src/utils/relicImage.ts client/src/__tests__/relicImage.test.ts
git commit -m "feat: extract relicImage utility from RelicIcon"
```

---

## Task 2: Redesign `RelicIcon` — bar-only square with rarity stripe

**Files:**
- Modify: `client/src/__tests__/RelicIcon.test.tsx`
- Modify: `client/src/__tests__/RelicBar.test.tsx`
- Modify: `client/src/components/RelicIcon.tsx`
- Modify: `client/src/components/RelicIcon.css`

> **TDD note:** Both test files are updated and confirmed failing BEFORE touching any implementation files.

- [ ] **Step 2.1: Update `RelicIcon.test.tsx` to match new contract**

Replace the entire file content:

```typescript
import { render, screen } from '@testing-library/react';
import { RelicIcon } from '../components/RelicIcon';

const commonRelic   = { type: 'worn-pouch',      name: 'Worn Pouch',      rarity: 'common'    as const, description: 'Draw 1 extra stone' };
const rareRelic     = { type: 'ember-core',       name: 'Ember Core',      rarity: 'rare'      as const, description: 'Burn never decays' };
const epicRelic     = { type: 'phoenix-feather',  name: 'Phoenix Feather', rarity: 'epic'      as const, description: 'Survive one lethal hit' };
const legendRelic   = { type: 'domino-crown',     name: 'Domino Crown',    rarity: 'legendary' as const, description: 'Doubles rule' };
const unknownRelic  = { type: 'not-a-relic',      name: 'Unknown',         rarity: 'common'    as const, description: 'No image' };

describe('RelicIcon', () => {
  it('applies common rarity class', () => {
    const { container } = render(<RelicIcon relic={commonRelic} />);
    expect(container.querySelector('.relic-icon--common')).toBeInTheDocument();
  });

  it('applies rare rarity class', () => {
    const { container } = render(<RelicIcon relic={rareRelic} />);
    expect(container.querySelector('.relic-icon--rare')).toBeInTheDocument();
  });

  it('applies epic rarity class', () => {
    const { container } = render(<RelicIcon relic={epicRelic} />);
    expect(container.querySelector('.relic-icon--epic')).toBeInTheDocument();
  });

  it('applies legendary rarity class', () => {
    const { container } = render(<RelicIcon relic={legendRelic} />);
    expect(container.querySelector('.relic-icon--legendary')).toBeInTheDocument();
  });

  it('renders img when image exists for type', () => {
    render(<RelicIcon relic={commonRelic} />);
    expect(screen.getByRole('img', { name: 'Worn Pouch' })).toBeInTheDocument();
  });

  it('renders fallback emoji when no image for type', () => {
    render(<RelicIcon relic={unknownRelic} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('✨')).toBeInTheDocument();
  });

  it('shows description as title attribute', () => {
    render(<RelicIcon relic={commonRelic} />);
    expect(screen.getByTitle('Draw 1 extra stone')).toBeInTheDocument();
  });

  it('adds glowing class when glowing prop is true', () => {
    const { container } = render(<RelicIcon relic={commonRelic} glowing />);
    expect(container.querySelector('.relic-icon--glowing')).toBeInTheDocument();
  });

  it('does not render name or rarity text labels', () => {
    render(<RelicIcon relic={commonRelic} />);
    expect(screen.queryByText('Worn Pouch')).toBeNull();
    expect(screen.queryByText('common')).toBeNull();
  });
});
```

- [ ] **Step 2.2: Update `RelicBar.test.tsx` — replace name-text assertions**

In `client/src/__tests__/RelicBar.test.tsx`, replace the `'renders a relic icon for each relic'` test body:

```typescript
it('renders a relic icon for each relic', async () => {
  const { container } = renderWithContext(mockContext());
  await waitFor(() => {
    const icons = container.querySelectorAll('.relic-icon');
    expect(icons).toHaveLength(2);
  });
});
```

- [ ] **Step 2.3: Run both test files to confirm failures**

```bash
npm test -- --testPathPattern="RelicIcon|RelicBar" 2>&1 | tail -15
```

Expected: FAIL — "renders img" fails (no img yet), "does not render name/rarity" fails (still renders text), RelicBar "renders a relic icon" may now differ.

- [ ] **Step 2.4: Update `RelicIcon.tsx`**

Replace the entire file:

```typescript
import { relicImage } from '../utils/relicImage';
import './RelicIcon.css';

interface Relic {
  type: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
}

interface Props {
  relic: Relic;
  glowing?: boolean;
}

export function RelicIcon({ relic, glowing = false }: Props) {
  const imageSrc = relicImage(relic.type);
  return (
    <div
      className={`relic-icon relic-icon--${relic.rarity}${glowing ? ' relic-icon--glowing' : ''}`}
      title={relic.description}
    >
      <div className="relic-icon__symbol">
        {imageSrc
          ? <img src={imageSrc} alt={relic.name} className="relic-icon__img" />
          : <span>✨</span>
        }
      </div>
    </div>
  );
}
```

- [ ] **Step 2.5: Replace `RelicIcon.css`**

Replace the entire file:

```css
.relic-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 8px;
  border: 2px solid var(--border);
  background: var(--bg-surface);
  overflow: hidden;
  cursor: default;
  flex-shrink: 0;
}

.relic-icon__symbol {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
}

.relic-icon__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}

/* Rarity stripe at bottom via ::after */
.relic-icon::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
}

/* Rarity colour variants — border + stripe */
.relic-icon--common    { border-color: var(--neutral); }
.relic-icon--common::after    { background: var(--neutral); }

.relic-icon--rare      { border-color: var(--armor); }
.relic-icon--rare::after      { background: var(--armor); }

.relic-icon--epic      { border-color: var(--earth); }
.relic-icon--epic::after      { background: var(--earth); }

.relic-icon--legendary { border-color: var(--gold); }
.relic-icon--legendary::after { background: var(--gold); }

/* Trigger glow animation */
@keyframes relic-trigger-glow {
  0%   { box-shadow: 0 0 0 0 rgba(255, 220, 80, 0); }
  20%  { box-shadow: 0 0 18px 8px rgba(255, 220, 80, 0.9); }
  80%  { box-shadow: 0 0 18px 8px rgba(255, 220, 80, 0.9); }
  100% { box-shadow: 0 0 0 0 rgba(255, 220, 80, 0); }
}

.relic-icon--glowing {
  animation: relic-trigger-glow 1.2s ease-in-out forwards;
}
```

- [ ] **Step 2.6: Run RelicIcon and RelicBar tests**

```bash
npm test -- --testPathPattern="RelicIcon|RelicBar" 2>&1 | tail -15
```

Expected: All PASS.

- [ ] **Step 2.7: Run full suite to check nothing else broke**

```bash
npm test -- --passWithNoTests 2>&1 | tail -5
```

Expected: All tests pass.

- [ ] **Step 2.8: Commit**

```bash
git add client/src/components/RelicIcon.tsx client/src/components/RelicIcon.css \
        client/src/__tests__/RelicIcon.test.tsx client/src/__tests__/RelicBar.test.tsx
git commit -m "feat: redesign RelicIcon as 52px bar icon with rarity stripe, no text labels"
```

---

## Task 3: Relic Selection Screen — 140px hero image

**Files:**
- Modify: `client/src/__tests__/RelicSelectionScreen.test.tsx`
- Modify: `client/src/screens/RelicSelectionScreen.tsx`
- Modify: `client/src/screens/RelicSelectionScreen.css`

- [ ] **Step 3.1: Update test mock and add img assertion**

In `client/src/__tests__/RelicSelectionScreen.test.tsx`:

1. Replace `mockOffer` — fix `relicId` values to lowercase kebab-case (keep rarity uppercase since `rarityClass()` lowercases them internally, and the `getByText('EPIC')` assertion must remain valid):

```typescript
const mockOffer = [
  { relicId: 'phoenix-feather', name: 'Phoenix Feather', rarity: 'EPIC',   description: 'Survive a lethal hit' },
  { relicId: 'worn-pouch',      name: 'Worn Pouch',      rarity: 'COMMON', description: 'Draw 1 extra stone' },
  { relicId: 'storm-amulet',    name: 'Storm Amulet',    rarity: 'RARE',   description: 'Lightning +5 damage' },
];
```

2. Add this test to the describe block:

```typescript
it('shows a relic image for each offer card', async () => {
  renderRelics();
  await waitFor(() => {
    const imgs = screen.getAllByRole('img');
    expect(imgs).toHaveLength(3);
  });
});
```

- [ ] **Step 3.2: Run test to confirm failure**

```bash
npm test -- --testPathPattern="RelicSelectionScreen" 2>&1 | tail -10
```

Expected: FAIL — `getAllByRole('img')` returns 0 elements (no images rendered yet).

- [ ] **Step 3.3: Update `RelicSelectionScreen.tsx`**

Replace the entire file:

```typescript
import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { relicImage } from '../utils/relicImage';
import './RelicSelectionScreen.css';

interface RelicOffer { relicId: string; name: string; rarity: string; description: string; }
interface Props { runId: string; }

function rarityClass(rarity: string): string {
  const r = rarity.toLowerCase();
  if (r === 'legendary') return 'legendary';
  if (r === 'epic') return 'epic';
  if (r === 'rare') return 'rare';
  return 'common';
}

export function RelicSelectionScreen({ runId }: Props) {
  const { navigate } = useGame();
  const [offer, setOffer] = useState<RelicOffer[]>([]);

  useEffect(() => {
    fetch(`/api/run/${runId}/relic-offer`)
      .then((r) => r.json())
      .then((data) => setOffer(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [runId]);

  async function handlePick(relicId: string) {
    await fetch(`/api/run/${runId}/relic-offer/pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relicId }),
    });
    navigate('dungeon-map');
  }

  if (offer.length === 0) {
    return <div className="relic-loading">Summoning relics…</div>;
  }

  return (
    <div className="relic-screen">
      <div className="relic-bg" />
      <div className="relic-content">
        <h2 className="relic-title">Choose Your Relic</h2>
        <div className="relic-cards">
          {offer.map((relic) => {
            const rc = rarityClass(relic.rarity);
            const imgSrc = relicImage(relic.relicId);
            return (
              <div
                key={relic.relicId}
                className={`relic-card relic-card--${rc}`}
                onClick={() => handlePick(relic.relicId)}
              >
                {imgSrc && (
                  <img
                    src={imgSrc}
                    alt={relic.name}
                    className="relic-card__art"
                    data-rarity={rc}
                  />
                )}
                <div className="relic-name">{relic.name}</div>
                <div className={`relic-rarity relic-rarity--${rc}`}>{relic.rarity}</div>
                <div className="relic-description">{relic.description}</div>
                <button className="btn-relic-select" onClick={(e) => { e.stopPropagation(); handlePick(relic.relicId); }}>
                  Select
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3.4: Add `.relic-card__art` styles to `RelicSelectionScreen.css`**

Append to the end of `client/src/screens/RelicSelectionScreen.css`:

```css
/* Hero relic art */
.relic-card__art {
  width: 140px;
  height: 140px;
  border-radius: 16px;
  border: 2px solid rgba(120, 90, 50, 0.6);
  object-fit: contain;
  image-rendering: pixelated;
  background: rgba(0, 0, 0, 0.35);
}

.relic-card__art[data-rarity="common"] {
  border-color: rgba(160, 160, 160, 0.7);
  box-shadow: 0 0 12px rgba(160, 160, 160, 0.2);
}

.relic-card__art[data-rarity="rare"] {
  border-color: rgba(60, 120, 255, 0.7);
  box-shadow: 0 0 16px rgba(60, 120, 255, 0.3);
}

.relic-card__art[data-rarity="epic"] {
  border-color: rgba(160, 60, 240, 0.7);
  box-shadow: 0 0 16px rgba(160, 60, 240, 0.3);
}

.relic-card__art[data-rarity="legendary"] {
  border-color: rgba(255, 180, 30, 0.8);
  box-shadow: 0 0 20px rgba(255, 160, 0, 0.4);
}
```

- [ ] **Step 3.5: Run tests**

```bash
npm test -- --testPathPattern="RelicSelectionScreen" 2>&1 | tail -10
```

Expected: All PASS.

- [ ] **Step 3.6: Commit**

```bash
git add client/src/screens/RelicSelectionScreen.tsx client/src/screens/RelicSelectionScreen.css \
        client/src/__tests__/RelicSelectionScreen.test.tsx
git commit -m "feat: show 140px hero relic art on selection screen"
```

---

## Task 4: Shop Screen — 72px horizontal relic card

**Files:**
- Modify: `client/src/__tests__/ShopScreen.test.tsx`
- Modify: `client/src/screens/ShopScreen.tsx`
- Modify: `client/src/screens/ShopScreen.css`

- [ ] **Step 4.1: Update shop test mock and add img assertion**

In `client/src/__tests__/ShopScreen.test.tsx`:

1. Update the relic item in `mockShop.items` to include `relicId` and `element: null`:

```typescript
{ id: 'item-2', type: 'relic', name: 'Worn Pouch', description: 'Draw 1 extra stone', cost: 80, sold: false, element: null, relicId: 'worn-pouch' },
```

2. Add this test to the describe block:

```typescript
it('shows a relic image for relic items', async () => {
  renderShop();
  await waitFor(() => {
    expect(screen.getByRole('img', { name: 'Worn Pouch' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4.2: Run test to confirm failure**

```bash
npm test -- --testPathPattern="ShopScreen" 2>&1 | tail -10
```

Expected: FAIL — `getByRole('img', { name: 'Worn Pouch' })` not found.

- [ ] **Step 4.3: Update `ShopScreen.tsx`**

Replace the entire file. Key changes: remove `RelicIcon` and `RELIC_DEFINITIONS` imports, use `relicImage()` with a null guard (`item.relicId ? relicImage(item.relicId) : undefined`), add `shop-item-card--relic` class and `shop-relic-body` wrapper:

```typescript
import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { relicImage } from '../utils/relicImage';
import './ShopScreen.css';

interface ShopItem {
  id: string;
  type: string;
  name: string;
  description: string;
  cost: number;
  sold: boolean;
  element: string | null;
  relicId: string | null;
}

interface ShopState {
  items: ShopItem[];
  playerGold: number;
}

interface Props { runId: string; }

export function ShopScreen({ runId }: Props) {
  const { navigate } = useGame();
  const [shop, setShop] = useState<ShopState | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`/api/run/${runId}/shop`)
      .then((r) => r.json())
      .then(setShop)
      .catch(() => {});
  }, [runId]);

  async function handleBuy(itemId: string) {
    const res = await fetch(`/api/run/${runId}/shop/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || 'Purchase failed'); return; }
    setMessage('');
    const shopRes = await fetch(`/api/run/${runId}/shop`);
    setShop(await shopRes.json());
  }

  async function handleLeave() {
    await fetch(`/api/run/${runId}/shop/leave`, { method: 'POST' });
    navigate('dungeon-map');
  }

  if (!shop) {
    return <div className="shop-loading">Opening the merchant's wares…</div>;
  }

  return (
    <div className="shop-screen">
      <div className="shop-bg" />
      <div className="shop-tint" />
      <div className="shop-content">
        <div className="shop-header">
          <h2 className="shop-title">Merchant</h2>
          <span className="shop-gold">
            <span className="shop-gold-label">Gold</span>
            {shop.playerGold}g
          </span>
        </div>

        {message && <p className="shop-message">{message}</p>}

        <div className="shop-items">
          {shop.items.map((item) => {
            const isRelic = item.type === 'relic';
            const imgSrc = isRelic && item.relicId ? relicImage(item.relicId) : undefined;
            return (
              <div
                key={item.id}
                className={`shop-item-card${item.sold ? ' shop-item-card--sold' : ''}${isRelic ? ' shop-item-card--relic' : ''}`}
              >
                {imgSrc && (
                  <img src={imgSrc} alt={item.name} className="shop-relic-art" />
                )}
                <div className="shop-relic-body">
                  <div className={`shop-item-name${item.sold ? ' shop-item-name--sold' : ''}`}>
                    {item.name}
                    {item.type === 'stone' && item.element && (
                      <span className={`shop-element-badge shop-element-badge--${item.element.toLowerCase()}`}>
                        {item.element}
                      </span>
                    )}
                  </div>
                  <div className="shop-item-desc">{item.description}</div>
                  <div className="shop-item-footer">
                    <span className="shop-item-cost">{item.cost}g</span>
                    <button
                      className="btn-shop-buy"
                      onClick={() => handleBuy(item.id)}
                      disabled={item.sold || shop.playerGold < item.cost}
                    >
                      {item.sold ? 'Sold' : 'Buy'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button className="btn-shop-leave" onClick={handleLeave}>Leave Shop</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4.4: Append relic card styles to `ShopScreen.css`**

Append to the end of `client/src/screens/ShopScreen.css`:

```css
/* Horizontal layout for relic items */
.shop-item-card--relic {
  flex-direction: row;
  align-items: flex-start;
  gap: 16px;
}

.shop-relic-art {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  border: 2px solid var(--gold, #ffd066);
  object-fit: contain;
  image-rendering: pixelated;
  background: rgba(0, 0, 0, 0.35);
  flex-shrink: 0;
}

.shop-relic-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
```

- [ ] **Step 4.5: Run ShopScreen tests**

```bash
npm test -- --testPathPattern="ShopScreen" 2>&1 | tail -10
```

Expected: All PASS.

- [ ] **Step 4.6: Run full suite**

```bash
npm test -- --passWithNoTests 2>&1 | tail -5
```

Expected: All tests pass.

- [ ] **Step 4.7: Commit**

```bash
git add client/src/screens/ShopScreen.tsx client/src/screens/ShopScreen.css \
        client/src/__tests__/ShopScreen.test.tsx
git commit -m "feat: show 72px horizontal relic art in shop cards"
```

---

## Task 5: Final verification and push

- [ ] **Step 5.1: Verify no dead imports remain**

```bash
cd "C:\Users\nicka\repo\Domino Game v2"
grep -n "RelicIcon\|RELIC_DEFINITIONS" client/src/screens/RelicSelectionScreen.tsx client/src/screens/ShopScreen.tsx
```

Expected: no output.

- [ ] **Step 5.2: Run full suite one final time**

```bash
npm test -- --passWithNoTests 2>&1 | tail -8
```

Expected: All tests pass.

- [ ] **Step 5.3: Push**

```bash
git push
```
