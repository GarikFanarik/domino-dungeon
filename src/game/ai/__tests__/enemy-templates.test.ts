import { getEnemyBagConfig } from '../enemy-templates';
import { ElementType } from '../../models/stone';

describe('getEnemyBagConfig', () => {
  it('returns correct config for Tomb Rat', () => {
    const config = getEnemyBagConfig('Tomb Rat');
    expect(config.pipSumRange).toEqual([2, 5]);
    expect(config.elements).toEqual([ElementType.Poison]);
    expect(config.elementalDensity).toBeCloseTo(0.10);
  });

  it('returns correct config for Crypt Sentinel', () => {
    const config = getEnemyBagConfig('Crypt Sentinel');
    expect(config.pipSumRange).toEqual([5, 7]);
    expect(config.elements).toEqual([ElementType.Earth]);
    expect(config.elementalDensity).toBeCloseTo(0.20);
  });

  it('returns correct config for Stonewarden', () => {
    const config = getEnemyBagConfig('Stonewarden');
    expect(config.pipSumRange).toEqual([8, 12]);
    expect(config.elements).toEqual([ElementType.Earth]);
    expect(config.elementalDensity).toBeCloseTo(0.30);
  });

  it('returns correct config for Abyssal Crystal', () => {
    const config = getEnemyBagConfig('Abyssal Crystal');
    expect(config.pipSumRange).toEqual([4, 7]);
    expect(config.elements).toEqual([ElementType.Ice]);
    expect(config.elementalDensity).toBeCloseTo(0.20);
  });

  it('returns correct config for Abyssal Warrior', () => {
    const config = getEnemyBagConfig('Abyssal Warrior');
    expect(config.pipSumRange).toEqual([5, 8]);
    expect(config.elements).toEqual([ElementType.Lightning]);
    expect(config.elementalDensity).toBeCloseTo(0.25);
  });

  it('returns correct config for Abyssal Lord', () => {
    const config = getEnemyBagConfig('Abyssal Lord');
    expect(config.pipSumRange).toEqual([8, 12]);
    expect(config.elements).toContain(ElementType.Ice);
    expect(config.elements).toContain(ElementType.Lightning);
    expect(config.elementalDensity).toBeCloseTo(0.35);
  });

  it('returns neutral fallback for unknown enemy', () => {
    const config = getEnemyBagConfig('Unknown Enemy');
    expect(config.pipSumRange).toEqual([0, 12]);
    expect(config.elements).toEqual([]);
    expect(config.elementalDensity).toBe(0);
  });
});
