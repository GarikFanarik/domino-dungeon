import { Chain } from '../chain';
import { calculateDamage, applyArmor } from '../damage';
import { defaultPlayerStats } from '../models/player-stats';
import { Stone } from '../models/stone';

function makeStone(id: string, leftPip: number, rightPip: number): Stone {
  return { id, leftPip, rightPip, element: null };
}

describe('calculateDamage', () => {
  const stats = defaultPlayerStats();

  it('single stone: no junctions → 0 damage', () => {
    const chain = new Chain();
    chain.playStone(makeStone('s1', 4, 2), 'left', false);

    const result = calculateDamage(chain, stats);
    expect(result.baseDamage).toBe(0);
    expect(result.finalDamage).toBe(0);
  });

  it('two stones [4|2]→[2|3]: junction at 2 → 2+2 = 4 damage', () => {
    const chain = new Chain();
    chain.playStone(makeStone('s1', 4, 2), 'left', false);
    // rightOpen=2; s2 leftPip=2 connects, flipped=false
    chain.playStone(makeStone('s2', 2, 3), 'right', false);

    const result = calculateDamage(chain, stats);
    expect(result.baseDamage).toBe(4);
    expect(result.finalDamage).toBe(4);
  });

  it('three stones [4|2]→[2|5]→[5|6]: junctions 2 and 5 → (2+2)+(5+5) = 14 damage', () => {
    const chain = new Chain();
    chain.playStone(makeStone('s1', 4, 2), 'left', false);
    chain.playStone(makeStone('s2', 2, 5), 'right', false);
    chain.playStone(makeStone('s3', 5, 6), 'right', false);

    const result = calculateDamage(chain, stats);
    expect(result.baseDamage).toBe(14);
    expect(result.finalDamage).toBe(14);
  });

  it('three stones [3|6]→[6|6]→[6|5]: junctions 6 and 6 → (6+6)+(6+6) = 24 damage', () => {
    const chain = new Chain();
    chain.playStone(makeStone('s1', 3, 6), 'left', false);
    chain.playStone(makeStone('s2', 6, 6), 'right', false);
    chain.playStone(makeStone('s3', 6, 5), 'right', false);

    const result = calculateDamage(chain, stats);
    expect(result.baseDamage).toBe(24);
    expect(result.finalDamage).toBe(24);
  });

  it('element bonus is added on top of junction damage', () => {
    const chain = new Chain();
    chain.playStone(makeStone('s1', 3, 4), 'left', false);
    chain.playStone(makeStone('s2', 4, 2), 'right', false);
    // junction at 4 → 4+4=8, plus elementBonus 5 = 13

    const result = calculateDamage(chain, stats, 5);
    expect(result.baseDamage).toBe(8);
    expect(result.elementBonus).toBe(5);
    expect(result.finalDamage).toBe(13);
  });

  it('element bonus on single stone: only flat bonus applies', () => {
    const chain = new Chain();
    chain.playStone(makeStone('s1', 3, 4), 'left', false);

    const result = calculateDamage(chain, stats, 6);
    expect(result.baseDamage).toBe(0);
    expect(result.finalDamage).toBe(6);
  });

  it('flipped stone: connecting pip is rightPip', () => {
    // s1=[1|5] rightOpen=5; s2=[2|5] played right flipped=true → rightPip=5 connects
    // junction at 5 → 5+5 = 10
    const chain = new Chain();
    chain.playStone(makeStone('s1', 1, 5), 'left', false);
    chain.playStone(makeStone('s2', 2, 5), 'right', true);

    const result = calculateDamage(chain, stats);
    expect(result.baseDamage).toBe(10);
  });

  it('chainBonus is always 0 (no multiplier)', () => {
    const chain = new Chain();
    chain.playStone(makeStone('s1', 1, 2), 'left', false);
    chain.playStone(makeStone('s2', 2, 3), 'right', false);
    chain.playStone(makeStone('s3', 3, 4), 'right', false);

    const result = calculateDamage(chain, stats);
    expect(result.chainBonus).toBe(0);
  });
});

describe('applyArmor', () => {
  it('armor fully absorbs damage when armor >= damage', () => {
    const result = applyArmor(5, 10);
    expect(result.damageToDeal).toBe(0);
    expect(result.armorRemaining).toBe(5);
  });

  it('armor exactly equals damage: no damage passes through, armor reaches 0', () => {
    const result = applyArmor(8, 8);
    expect(result.damageToDeal).toBe(0);
    expect(result.armorRemaining).toBe(0);
  });

  it('damage exceeds armor: remainder hits HP, armor depleted to 0', () => {
    const result = applyArmor(10, 3);
    expect(result.damageToDeal).toBe(7);
    expect(result.armorRemaining).toBe(0);
  });

  it('zero armor: full damage passes through', () => {
    const result = applyArmor(15, 0);
    expect(result.damageToDeal).toBe(15);
    expect(result.armorRemaining).toBe(0);
  });

  it('zero damage: armor unchanged', () => {
    const result = applyArmor(0, 10);
    expect(result.damageToDeal).toBe(0);
    expect(result.armorRemaining).toBe(10);
  });
});
