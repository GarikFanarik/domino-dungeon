import { Enemy } from '../../../game/models/enemy';
import { applySlowEffect, applyFreezeEffect, isEnemyFrozen, processFreeze, processSlowDecay } from '../ice';

function makeEnemy(): Enemy {
  return { id: 'e1', name: 'Troll', hp: { current: 60, max: 60 }, status: { burn: 0, slow: 0, frozen: false, stunned: false, poison: 0 } };
}

describe('Ice element', () => {
  test('applySlowEffect adds slow stacks', () => {
    const enemy = makeEnemy();
    applySlowEffect(enemy, 1);
    expect(enemy.status.slow).toBe(1);
  });

  test('applySlowEffect caps at 3 stacks', () => {
    const enemy = makeEnemy();
    applySlowEffect(enemy, 5);
    expect(enemy.status.slow).toBe(3);
  });

  test('applySlowEffect stacks additively up to cap', () => {
    const enemy = makeEnemy();
    applySlowEffect(enemy, 2);
    applySlowEffect(enemy, 2);
    expect(enemy.status.slow).toBe(3); // capped
  });

  test('applyFreezeEffect sets frozen to true', () => {
    const enemy = makeEnemy();
    applyFreezeEffect(enemy);
    expect(isEnemyFrozen(enemy)).toBe(true);
  });

  test('processFreeze returns true and clears freeze when frozen', () => {
    const enemy = makeEnemy();
    applyFreezeEffect(enemy);
    const skipped = processFreeze(enemy);
    expect(skipped).toBe(true);
    expect(isEnemyFrozen(enemy)).toBe(false);
  });

  test('processFreeze returns false when not frozen', () => {
    const enemy = makeEnemy();
    const skipped = processFreeze(enemy);
    expect(skipped).toBe(false);
  });

  test('processSlowDecay decrements slow by 1', () => {
    const enemy = makeEnemy();
    applySlowEffect(enemy, 2);
    processSlowDecay(enemy);
    expect(enemy.status.slow).toBe(1);
  });

  test('processSlowDecay does not go below 0', () => {
    const enemy = makeEnemy();
    processSlowDecay(enemy);
    expect(enemy.status.slow).toBe(0);
  });
});
