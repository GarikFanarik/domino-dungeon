import { Enemy } from '../../../game/models/enemy';
import { applyPoison, processPoisonTick } from '../poison';

function makeEnemy(): Enemy {
  return { id: 'e1', name: 'Spider', hp: { current: 40, max: 40 }, status: { burn: 0, slow: 0, frozen: false, stunned: false, poison: 0 } };
}

describe('Poison element', () => {
  test('applyPoison adds stacks', () => {
    const enemy = makeEnemy();
    applyPoison(enemy, 2);
    expect(enemy.status.poison).toBe(2);
  });
  test('applyPoison stacks additively', () => {
    const enemy = makeEnemy();
    applyPoison(enemy, 1);
    applyPoison(enemy, 3);
    expect(enemy.status.poison).toBe(4);
  });
  test('processPoisonTick deals damage equal to stack count', () => {
    const enemy = makeEnemy();
    applyPoison(enemy, 3);
    const dmg = processPoisonTick(enemy);
    expect(dmg).toBe(3);
  });
  test('processPoisonTick does NOT decrement stacks', () => {
    const enemy = makeEnemy();
    applyPoison(enemy, 3);
    processPoisonTick(enemy);
    expect(enemy.status.poison).toBe(3); // poison never decreases naturally
  });
  test('processPoisonTick returns 0 when no poison', () => {
    const enemy = makeEnemy();
    expect(processPoisonTick(enemy)).toBe(0);
  });
  test('processPoisonTick with virulent doubles damage', () => {
    const enemy = makeEnemy();
    applyPoison(enemy, 3);
    expect(processPoisonTick(enemy, true)).toBe(6);
  });
});
