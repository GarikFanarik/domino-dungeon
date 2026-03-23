import { defaultPlayerStats } from '../../models/player-stats';
import {
  applyEmberCore,
  applyFrostbiteRing,
  applyStormAmulet,
  applyVenomGland,
  applyIronSkin,
  RARE_RELICS,
} from '../rare';

describe('Rare relics', () => {
  test('all 5 rare relics are defined', () => {
    expect(RARE_RELICS.length).toBe(5);
  });

  test('EmberCore sets burnNoDecay to true', () => {
    const stats = defaultPlayerStats();
    applyEmberCore(stats);
    expect(stats.burnNoDecay).toBe(true);
  });

  test('FrostbiteRing sets frostbiteRing flag to true', () => {
    const stats = defaultPlayerStats();
    applyFrostbiteRing(stats);
    expect(stats.frostbiteRing).toBe(true);
  });

  test('StormAmulet increases lightning flat bonus to +5 per stone', () => {
    const stats = defaultPlayerStats();
    applyStormAmulet(stats);
    expect(stats.lightningFlatBonus).toBe(2); // +2 on top of base 3 = 5 total
  });

  test('VenomGland sets poisonNoDecay to true', () => {
    const stats = defaultPlayerStats();
    applyVenomGland(stats);
    expect(stats.poisonNoDecay).toBe(true);
  });

  test('IronSkin sets armorGainBonus to 1', () => {
    const stats = defaultPlayerStats();
    applyIronSkin(stats);
    expect(stats.armorGainBonus).toBe(1);
  });
});
