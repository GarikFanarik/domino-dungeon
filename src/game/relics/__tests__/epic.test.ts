import { Enemy } from '../../models/enemy';
import {
  EPIC_RELICS,
  applyPhoenixFeather,
  applyChainMastersGlove,
  applyVoltaicLens,
  applyPoisonTome,
} from '../epic';

function makeEnemy(): Enemy {
  return { id: 'e1', name: 'G', hp: { current: 50, max: 50 }, status: { burn: 0, slow: 0, frozen: false, stunned: false, poison: 0 } };
}

describe('Epic relics', () => {
  test('all 5 epic relics are defined', () => {
    expect(EPIC_RELICS.length).toBe(5);
  });

  test('PhoenixFeather restores 30% of max HP on lethal hit', () => {
    const state = { phoenixUsed: false };
    const restored = applyPhoenixFeather(0, 80, state);
    expect(restored).toBe(24); // 30% of 80
    expect(state.phoenixUsed).toBe(true);
  });

  test('PhoenixFeather returns at least 1 HP', () => {
    const state = { phoenixUsed: false };
    const restored = applyPhoenixFeather(0, 1, state);
    expect(restored).toBe(1);
  });

  test('PhoenixFeather does nothing after being used', () => {
    const state = { phoenixUsed: true };
    expect(applyPhoenixFeather(0, 80, state)).toBe(0);
  });

  test('PhoenixFeather does nothing when HP > 0', () => {
    const state = { phoenixUsed: false };
    expect(applyPhoenixFeather(5, 80, state)).toBe(0);
    expect(state.phoenixUsed).toBe(false);
  });

  test('ChainMastersGlove doubles damage on every 5th stone', () => {
    expect(applyChainMastersGlove(5, 10)).toBe(20);
    expect(applyChainMastersGlove(4, 10)).toBe(10);
    expect(applyChainMastersGlove(10, 8)).toBe(16);
  });

  test('VoltaicLens adds 15 bonus damage on Overload', () => {
    expect(applyVoltaicLens(true, 20)).toBe(35);
    expect(applyVoltaicLens(false, 20)).toBe(20);
  });

  test('PoisonTome applies 3 poison stacks at combat start', () => {
    const enemy = makeEnemy();
    applyPoisonTome(enemy);
    expect(enemy.status.poison).toBe(3);
  });
});
