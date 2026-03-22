import { defaultPlayerState } from '../../models/player-state';
import { Enemy } from '../../models/enemy';
import { defaultPlayerStats } from '../../models/player-stats';
import {
  applyEmberCore,
  applyFrostbiteRing,
  applyStormAmulet,
  applyVenomGland,
  applyIronSkin,
  RARE_RELICS,
} from '../rare';

function makeEnemy(): Enemy {
  return { id: 'e1', name: 'G', hp: { current: 50, max: 50 }, status: { burn: 0, slow: 0, frozen: false, stunned: false, poison: 0 } };
}

describe('Rare relics', () => {
  test('all 5 rare relics are defined', () => {
    expect(RARE_RELICS.length).toBe(5);
  });

  test('EmberCore adds +1 burn stack bonus to player stats', () => {
    const stats = defaultPlayerStats();
    applyEmberCore(stats);
    expect(stats.burnStackBonus).toBe(1);
  });

  test('FrostbiteRing adds +1 slow stack bonus', () => {
    const stats = defaultPlayerStats();
    applyFrostbiteRing(stats);
    expect(stats.slowStackBonus).toBe(1);
  });

  test('StormAmulet increases lightning flat bonus to +5 per stone', () => {
    const stats = defaultPlayerStats();
    applyStormAmulet(stats);
    expect(stats.lightningFlatBonus).toBe(2); // +2 on top of base 3 = 5 total
  });

  test('VenomGland adds +1 poison damage per stack', () => {
    const stats = defaultPlayerStats();
    applyVenomGland(stats);
    expect(stats.poisonDamageBonus).toBe(1);
  });

  test('IronSkin raises armor cap from 20 to 35', () => {
    const stats = defaultPlayerStats();
    applyIronSkin(stats);
    expect(stats.armorCap).toBe(35);
  });
});
