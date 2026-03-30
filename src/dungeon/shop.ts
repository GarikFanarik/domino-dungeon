import seedrandom from 'seedrandom';
import { Run } from './run';
import { spendGold } from './gold';
import { ShopItem } from './node-types';
import { ElementType } from '../game/models/stone';
import { ALL_RELICS } from './relic-offer';

export interface ShopState {
  items: ShopItem[];
  soldIds: Set<string>;
}

export interface BuyResult {
  success: boolean;
  reason?: string;
  item?: ShopItem;
}

export function generateShopInventory(act: number, seed: string): ShopItem[] {
  const rng = seedrandom(seed);
  const items: ShopItem[] = [];
  const elements = [ElementType.Fire, ElementType.Ice, ElementType.Lightning, ElementType.Poison, ElementType.Earth];

  // 3 stones (10-16g)
  for (let i = 0; i < 3; i++) {
    const price = Math.floor(rng() * 7) + 10;
    const element = elements[Math.floor(rng() * elements.length)];
    items.push({ id: `shop-stone-${act}-${i}-${seed}`, type: 'stone', price, payload: { element } });
  }

  // 1 relic (20-30g) — pick a specific relic deterministically from seed
  const relicPrice = Math.floor(rng() * 11) + 20;
  const shopRelic = ALL_RELICS[Math.floor(rng() * ALL_RELICS.length)];
  items.push({ id: `shop-relic-${act}-${seed}`, type: 'relic', price: relicPrice, payload: { relicId: shopRelic.id } });

  // 1 potion (6g)
  items.push({ id: `shop-potion-${act}-${seed}`, type: 'potion', price: 6, payload: null });

  // 1 stone removal (15g)
  items.push({ id: `shop-removal-${act}-${seed}`, type: 'removal', price: 15, payload: null });

  return items;
}

export function buyItem(run: Run, shop: ShopState, itemId: string): BuyResult {
  const item = shop.items.find(i => i.id === itemId);
  if (!item) return { success: false, reason: 'Item not found' };
  if (shop.soldIds.has(itemId)) return { success: false, reason: 'Already sold' };
  if (!spendGold(run, item.price)) return { success: false, reason: 'Insufficient gold' };
  shop.soldIds.add(itemId);
  return { success: true, item };
}
