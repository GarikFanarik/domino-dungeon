import { Enemy } from '../../../game/models/enemy';
import { applyBurn, processBurnTick, BurnResult } from '../fire';

function makeEnemy(hp = 50): Enemy {
  return { id: 'e1', name: 'Goblin', hp: { current: hp, max: hp }, status: { burn: 0, slow: 0, frozen: false, stunned: false, poison: 0 } };
}

describe('Fire element', () => {
  test('applyBurn adds stacks to enemy', () => {
    const enemy = makeEnemy();
    applyBurn(enemy, 2);
    expect(enemy.status.burn).toBe(2);
  });

  test('applyBurn stacks additively', () => {
    const enemy = makeEnemy();
    applyBurn(enemy, 1);
    applyBurn(enemy, 2);
    expect(enemy.status.burn).toBe(3);
  });

  test('processBurnTick deals 2 damage per stack', () => {
    const enemy = makeEnemy();
    applyBurn(enemy, 3);
    const result = processBurnTick(enemy);
    expect(result.damage).toBe(6); // 3 stacks * 2
  });

  test('processBurnTick decrements stacks by 1', () => {
    const enemy = makeEnemy();
    applyBurn(enemy, 3);
    processBurnTick(enemy);
    expect(enemy.status.burn).toBe(2);
  });

  test('processBurnTick returns 0 damage when no burn', () => {
    const enemy = makeEnemy();
    const result = processBurnTick(enemy);
    expect(result.damage).toBe(0);
    expect(enemy.status.burn).toBe(0);
  });

  test('processBurnTick with Inferno doubles damage (inferno flag)', () => {
    const enemy = makeEnemy();
    applyBurn(enemy, 2);
    const result = processBurnTick(enemy, true);
    expect(result.damage).toBe(8); // 2 stacks * 2 * 2 (inferno)
  });

  test('burn expires: stacks reach 0 stop ticking', () => {
    const enemy = makeEnemy();
    applyBurn(enemy, 1);
    processBurnTick(enemy); // stacks go to 0
    expect(enemy.status.burn).toBe(0);
    const result = processBurnTick(enemy);
    expect(result.damage).toBe(0);
  });
});
