import { EnemyTemplate, scaleEnemy, EnemyTemplateType, createBossEnemy } from '../enemy-templates';

describe('Enemy difficulty scaling', () => {
  test('Act 1 normal enemy has 20-40 HP', () => {
    const template: EnemyTemplate = { act: 1, type: EnemyTemplateType.Normal, name: 'Goblin' };
    const enemy = scaleEnemy(template, 1, 'seed1');
    expect(enemy.hp.max).toBeGreaterThanOrEqual(20);
    expect(enemy.hp.max).toBeLessThanOrEqual(40);
  });

  test('Act 2 normal enemy has 40-70 HP', () => {
    const template: EnemyTemplate = { act: 2, type: EnemyTemplateType.Normal, name: 'Orc' };
    const enemy = scaleEnemy(template, 2, 'seed2');
    expect(enemy.hp.max).toBeGreaterThanOrEqual(40);
    expect(enemy.hp.max).toBeLessThanOrEqual(70);
  });

  test('Act 3 normal enemy has 60-100 HP', () => {
    const template: EnemyTemplate = { act: 3, type: EnemyTemplateType.Normal, name: 'Demon' };
    const enemy = scaleEnemy(template, 3, 'seed3');
    expect(enemy.hp.max).toBeGreaterThanOrEqual(60);
    expect(enemy.hp.max).toBeLessThanOrEqual(100);
  });

  test('Elite enemy has +50% HP vs normal', () => {
    const normal: EnemyTemplate = { act: 1, type: EnemyTemplateType.Normal, name: 'Goblin' };
    const elite: EnemyTemplate = { act: 1, type: EnemyTemplateType.Elite, name: 'Goblin Elite' };
    const normalEnemy = scaleEnemy(normal, 1, 'seed');
    const eliteEnemy = scaleEnemy(elite, 1, 'seed');
    expect(eliteEnemy.hp.max).toBe(Math.floor(normalEnemy.hp.max * 1.5));
  });

  test('scaleEnemy is deterministic with same seed', () => {
    const template: EnemyTemplate = { act: 2, type: EnemyTemplateType.Normal, name: 'Troll' };
    const e1 = scaleEnemy(template, 2, 'fixed-seed');
    const e2 = scaleEnemy(template, 2, 'fixed-seed');
    expect(e1.hp.max).toBe(e2.hp.max);
  });

  test('Boss enemy has phase2 threshold at 50% HP', () => {
    const boss = createBossEnemy(1, 'bosseed');
    expect(boss.phase2Threshold).toBe(Math.floor(boss.hp.max * 0.5));
  });
});
