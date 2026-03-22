import { defaultPlayerState } from '../../models/player-state';
import { Bag } from '../../bag';
import {
  RelicType,
  applyWornPouch,
  applyLuckyPip,
  applyCrackedShield,
  applyTravelerBoots,
  applyPebbleCharm,
  RelicDefinition,
  COMMON_RELICS,
} from '../common';

describe('Common relics', () => {
  test('all 5 common relics are defined', () => {
    expect(COMMON_RELICS.length).toBe(5);
    const ids = COMMON_RELICS.map((r: RelicDefinition) => r.id);
    expect(ids).toContain(RelicType.WornPouch);
    expect(ids).toContain(RelicType.LuckyPip);
    expect(ids).toContain(RelicType.CrackedShield);
    expect(ids).toContain(RelicType.TravelerBoots);
    expect(ids).toContain(RelicType.PebbleCharm);
  });

  test('WornPouch adds 2 stones to bag', () => {
    const bag = new Bag([]);
    expect(bag.size).toBe(0);
    applyWornPouch(bag);
    expect(bag.size).toBe(2);
  });

  test('LuckyPip swaps a stone in hand without using swap action', () => {
    const bag = new Bag();
    const hand = [bag.draw(1)[0]];
    const originalId = hand[0].id;
    const result = applyLuckyPip(hand, bag);
    expect(result.success).toBe(true);
    expect(hand[0].id).not.toBe(originalId);
  });

  test('LuckyPip fails when hand is empty', () => {
    const bag = new Bag();
    const result = applyLuckyPip([], bag);
    expect(result.success).toBe(false);
  });

  test('CrackedShield grants 5 armor at combat start', () => {
    const player = defaultPlayerState();
    applyCrackedShield(player, 20);
    expect(player.armor).toBe(5);
  });

  test('TravelerBoots grants 5 gold', () => {
    const goldBefore = 10;
    const gold = applyTravelerBoots(goldBefore);
    expect(gold).toBe(15);
  });

  test('PebbleCharm adds +1 armor per Earth stone (on top of normal)', () => {
    // Normal earth gives 3 armor per stone, charm adds +1 = 4 per stone
    const bonus = applyPebbleCharm(2); // 2 earth stones
    expect(bonus).toBe(2); // +1 extra per stone = +2 total bonus armor
  });
});
