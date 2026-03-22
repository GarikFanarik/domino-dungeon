import { dealDamage, heal, isDead, DamageResult, HasHP } from '../hp';

function makeTarget(current: number, max: number): HasHP {
  return { hp: { current, max } };
}

describe('HP system', () => {
  test('dealDamage reduces current HP', () => {
    const target = makeTarget(50, 50);
    const result = dealDamage(target, 20);
    expect(target.hp.current).toBe(30);
    expect(result.damageTaken).toBe(20);
  });

  test('dealDamage cannot reduce HP below 0', () => {
    const target = makeTarget(10, 50);
    const result = dealDamage(target, 30);
    expect(target.hp.current).toBe(0);
    expect(result.damageTaken).toBe(10); // actual damage = HP remaining
  });

  test('dealDamage tracks overkill', () => {
    const target = makeTarget(5, 50);
    const result = dealDamage(target, 20);
    expect(result.overkill).toBe(15);
  });

  test('dealDamage overkill is 0 when not killed', () => {
    const target = makeTarget(50, 50);
    const result = dealDamage(target, 10);
    expect(result.overkill).toBe(0);
  });

  test('heal increases current HP', () => {
    const target = makeTarget(30, 80);
    const healed = heal(target, 20);
    expect(target.hp.current).toBe(50);
    expect(healed).toBe(20);
  });

  test('heal cannot exceed max HP', () => {
    const target = makeTarget(70, 80);
    const healed = heal(target, 20);
    expect(target.hp.current).toBe(80);
    expect(healed).toBe(10); // only 10 was actually healed
  });

  test('isDead returns true when HP is 0', () => {
    const target = makeTarget(0, 50);
    expect(isDead(target)).toBe(true);
  });

  test('isDead returns false when HP > 0', () => {
    const target = makeTarget(1, 50);
    expect(isDead(target)).toBe(false);
  });

  test('deal 0 damage does nothing', () => {
    const target = makeTarget(50, 50);
    const result = dealDamage(target, 0);
    expect(target.hp.current).toBe(50);
    expect(result.damageTaken).toBe(0);
  });
});
