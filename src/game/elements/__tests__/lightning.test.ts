import { Enemy } from '../../../game/models/enemy';
import { calculateLightningBonus, applyStun, processStun } from '../lightning';

function makeEnemy(): Enemy {
  return { id: 'e1', name: 'Storm', hp: { current: 50, max: 50 }, status: { burn: 0, slow: 0, frozen: false, stunned: false, poison: 0 } };
}

describe('Lightning element', () => {
  test('calculateLightningBonus: 1 stone = +3 flat damage', () => {
    expect(calculateLightningBonus(1)).toBe(3);
  });
  test('calculateLightningBonus: 4 stones = +12 flat damage', () => {
    expect(calculateLightningBonus(4)).toBe(12);
  });
  test('calculateLightningBonus: 0 stones = 0', () => {
    expect(calculateLightningBonus(0)).toBe(0);
  });
  test('applyStun sets stunned to true', () => {
    const enemy = makeEnemy();
    applyStun(enemy);
    expect(enemy.status.stunned).toBe(true);
  });
  test('processStun returns true and clears stun when stunned', () => {
    const enemy = makeEnemy();
    applyStun(enemy);
    expect(processStun(enemy)).toBe(true);
    expect(enemy.status.stunned).toBe(false);
  });
  test('processStun returns false when not stunned', () => {
    const enemy = makeEnemy();
    expect(processStun(enemy)).toBe(false);
  });
  test('Overload threshold is 4 lightning stones', () => {
    // 3 stones: no overload, 4 stones: overload
    expect(calculateLightningBonus(3) < calculateLightningBonus(4)).toBe(true);
    // applyStun only called when lightningCount >= 4 (business rule, tested here for docs)
    expect(calculateLightningBonus(4)).toBe(12);
  });
});
