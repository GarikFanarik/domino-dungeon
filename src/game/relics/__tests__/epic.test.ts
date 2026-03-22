import { defaultPlayerState } from '../../models/player-state';
import { defaultPlayerStats } from '../../models/player-stats';
import { Enemy } from '../../models/enemy';
import {
  EPIC_RELICS,
  applyPhoenixFeather,
  applyChainMastersGlove,
  applyVoltaicLens,
  applyGlacialHeart,
  applyPoisonTome,
} from '../epic';

function makeEnemy(): Enemy {
  return { id: 'e1', name: 'G', hp: { current: 50, max: 50 }, status: { burn: 0, slow: 0, frozen: false, stunned: false, poison: 0 } };
}

describe('Epic relics', () => {
  test('all 5 epic relics are defined', () => {
    expect(EPIC_RELICS.length).toBe(5);
  });

  test('PhoenixFeather prevents death once: isDead returns false at 0 HP if unused', () => {
    const state = { phoenixUsed: false };
    const prevented = applyPhoenixFeather(0, state);
    expect(prevented).toBe(true);
    expect(state.phoenixUsed).toBe(true);
  });

  test('PhoenixFeather does nothing after being used once', () => {
    const state = { phoenixUsed: true };
    const prevented = applyPhoenixFeather(0, state);
    expect(prevented).toBe(false);
  });

  test('PhoenixFeather does nothing when HP > 0', () => {
    const state = { phoenixUsed: false };
    const prevented = applyPhoenixFeather(5, state);
    expect(prevented).toBe(false);
    expect(state.phoenixUsed).toBe(false);
  });

  test('ChainMastersGlove doubles damage on every 5th stone', () => {
    expect(applyChainMastersGlove(5, 10)).toBe(20); // 5th stone doubles
    expect(applyChainMastersGlove(4, 10)).toBe(10); // 4th stone normal
    expect(applyChainMastersGlove(10, 8)).toBe(16); // 10th stone doubles
  });

  test('VoltaicLens adds 15 bonus damage on Overload', () => {
    expect(applyVoltaicLens(true, 20)).toBe(35);
    expect(applyVoltaicLens(false, 20)).toBe(20);
  });

  test('GlacialHeart multiplies damage by 1.5 when enemy frozen', () => {
    const enemy = makeEnemy();
    enemy.status.frozen = true;
    expect(applyGlacialHeart(enemy, 20)).toBe(30);
  });

  test('GlacialHeart has no effect when not frozen', () => {
    const enemy = makeEnemy();
    expect(applyGlacialHeart(enemy, 20)).toBe(20);
  });

  test('PoisonTome applies 3 poison stacks at combat start', () => {
    const enemy = makeEnemy();
    applyPoisonTome(enemy);
    expect(enemy.status.poison).toBe(3);
  });
});
