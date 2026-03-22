import { generateShopInventory, buyItem, ShopState } from '../shop';
import { startRun } from '../run';
import { awardGold } from '../gold';

describe('Shop node', () => {
  test('generateShopInventory returns 6 items (3 stones, 1 relic, 1 potion, 1 removal)', () => {
    const items = generateShopInventory(1, 'shop-seed');
    expect(items.length).toBe(6);
    const types = items.map(i => i.type);
    expect(types.filter(t => t === 'stone').length).toBe(3);
    expect(types.filter(t => t === 'relic').length).toBe(1);
    expect(types.filter(t => t === 'potion').length).toBe(1);
    expect(types.filter(t => t === 'removal').length).toBe(1);
  });

  test('items have prices in expected ranges', () => {
    const items = generateShopInventory(1, 'seed');
    const stones = items.filter(i => i.type === 'stone');
    stones.forEach(s => {
      expect(s.price).toBeGreaterThanOrEqual(50);
      expect(s.price).toBeLessThanOrEqual(80);
    });
    const potion = items.find(i => i.type === 'potion')!;
    expect(potion.price).toBe(30);
    const removal = items.find(i => i.type === 'removal')!;
    expect(removal.price).toBe(75);
  });

  test('same seed produces same inventory', () => {
    const inv1 = generateShopInventory(1, 'fixed');
    const inv2 = generateShopInventory(1, 'fixed');
    expect(inv1.map(i => i.id)).toEqual(inv2.map(i => i.id));
  });

  test('buyItem deducts gold and marks item sold', () => {
    const run = startRun('u1', 's1');
    awardGold(run, 200);
    const shop: ShopState = { items: generateShopInventory(1, 's'), soldIds: new Set() };
    const stone = shop.items.find(i => i.type === 'stone')!;
    const result = buyItem(run, shop, stone.id);
    expect(result.success).toBe(true);
    expect(shop.soldIds.has(stone.id)).toBe(true);
    expect(run.gold).toBe(200 - stone.price);
  });

  test('buyItem fails when insufficient gold', () => {
    const run = startRun('u1', 's1');
    // gold is 0
    const shop: ShopState = { items: generateShopInventory(1, 's'), soldIds: new Set() };
    const item = shop.items[0];
    const result = buyItem(run, shop, item.id);
    expect(result.success).toBe(false);
  });

  test('buyItem fails when item already sold', () => {
    const run = startRun('u1', 's1');
    awardGold(run, 200);
    const shop: ShopState = { items: generateShopInventory(1, 's'), soldIds: new Set() };
    const stone = shop.items.find(i => i.type === 'stone')!;
    buyItem(run, shop, stone.id);
    const result = buyItem(run, shop, stone.id); // try again
    expect(result.success).toBe(false);
  });
});
