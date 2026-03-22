import seedrandom from 'seedrandom';
import { Run } from './run';
import { spendGold } from './gold';
import { ShopItem } from './node-types';
import { ElementType } from '../game/models/stone';

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

  // 3 stones (50-80g)
  for (let i = 0; i < 3; i++) {
    const price = Math.floor(rng() * 31) + 50;
    const element = elements[Math.floor(rng() * elements.length)];
    items.push({ id: `shop-stone-${act}-${i}-${seed}`, type: 'stone', price, payload: { element } });
  }

  // 1 relic (100-150g)
  const relicPrice = Math.floor(rng() * 51) + 100;
  items.push({ id: `shop-relic-${act}-${seed}`, type: 'relic', price: relicPrice, payload: null });

  // 1 potion (30g)
  items.push({ id: `shop-potion-${act}-${seed}`, type: 'potion', price: 30, payload: null });

  // 1 stone removal (75g)
  items.push({ id: `shop-removal-${act}-${seed}`, type: 'removal', price: 75, payload: null });

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
