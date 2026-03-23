import { defaultPlayerState } from '../../models/player-state';
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

  test('WornPouch increases hand size by 1', () => {
    expect(applyWornPouch(7)).toBe(8);
  });

  test('LuckyPip increases swaps per turn by 1', () => {
    expect(applyLuckyPip(1)).toBe(2);
    expect(applyLuckyPip(2)).toBe(3);
  });

  test('CrackedShield grants 5 armor at combat start', () => {
    const player = defaultPlayerState();
    applyCrackedShield(player, 20);
    expect(player.armor).toBe(5);
  });

  test('TravelerBoots returns 1 gold per stone in the winning chain', () => {
    expect(applyTravelerBoots(5)).toBe(5);
    expect(applyTravelerBoots(0)).toBe(0);
  });

  test('PebbleCharm triggers fortify at 2+ earth stones', () => {
    expect(applyPebbleCharm(2)).toBe(true);
    expect(applyPebbleCharm(3)).toBe(true);
    expect(applyPebbleCharm(1)).toBe(false);
  });
});
