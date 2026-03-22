import { ElementType } from '../../models/stone';
import { analyzeChain, applyChainEffects, ChainAnalysis, CombatEffects } from '../element-engine';
import { defaultPlayerState } from '../../models/player-state';
import { Chain } from '../../chain';
import { Stone } from '../../models/stone';

function makeStone(element: ElementType | null, left = 3, right = 3): Stone {
  return { id: Math.random().toString(), leftPip: left, rightPip: right, element };
}

function buildChain(elements: (ElementType | null)[]): Chain {
  const chain = new Chain();
  elements.forEach((el, i) => {
    const stone = makeStone(el, i === 0 ? 3 : 3, 3);
    if (chain.stones.length === 0) {
      chain.playStone(stone, 'right', false);
    } else if (chain.canPlay(stone).right) {
      chain.playStone(stone, 'right', false);
    } else {
      chain.playStone(stone, 'left', false);
    }
  });
  return chain;
}

describe('Element engine', () => {
  test('analyzeChain counts elements correctly', () => {
    const chain = buildChain([ElementType.Fire, ElementType.Fire, ElementType.Ice]);
    const analysis = analyzeChain(chain);
    expect(analysis.counts[ElementType.Fire]).toBe(2);
    expect(analysis.counts[ElementType.Ice]).toBe(1);
    expect(analysis.counts[ElementType.Lightning] ?? 0).toBe(0);
  });

  test('analyzeChain detects Inferno (3+ Fire)', () => {
    const chain = buildChain([ElementType.Fire, ElementType.Fire, ElementType.Fire]);
    const analysis = analyzeChain(chain);
    expect(analysis.infernoTriggered).toBe(true);
  });

  test('analyzeChain no Inferno with 2 Fire', () => {
    const chain = buildChain([ElementType.Fire, ElementType.Fire]);
    const analysis = analyzeChain(chain);
    expect(analysis.infernoTriggered).toBe(false);
  });

  test('analyzeChain detects Freeze (2+ Ice)', () => {
    const chain = buildChain([ElementType.Ice, ElementType.Ice]);
    const analysis = analyzeChain(chain);
    expect(analysis.freezeTriggered).toBe(true);
  });

  test('analyzeChain no Freeze with 1 Ice', () => {
    const chain = buildChain([ElementType.Ice]);
    const analysis = analyzeChain(chain);
    expect(analysis.freezeTriggered).toBe(false);
  });

  test('analyzeChain detects Overload (4+ Lightning)', () => {
    const chain = buildChain([ElementType.Lightning, ElementType.Lightning, ElementType.Lightning, ElementType.Lightning]);
    const analysis = analyzeChain(chain);
    expect(analysis.overloadTriggered).toBe(true);
  });

  test('analyzeChain no Overload with 3 Lightning', () => {
    const chain = buildChain([ElementType.Lightning, ElementType.Lightning, ElementType.Lightning]);
    const analysis = analyzeChain(chain);
    expect(analysis.overloadTriggered).toBe(false);
  });

  test('applyChainEffects applies burn from Fire stones', () => {
    const chain = buildChain([ElementType.Fire, ElementType.Fire]);
    const analysis = analyzeChain(chain);
    const player = defaultPlayerState();
    const enemy = { id: 'e1', name: 'G', hp: { current: 50, max: 50 }, status: { burn: 0, slow: 0, frozen: false, stunned: false, poison: 0 } };
    const effects = applyChainEffects(analysis, player, enemy);
    expect(enemy.status.burn).toBe(2);
    expect(effects.burnApplied).toBe(2);
  });

  test('applyChainEffects applies slow from Ice stones', () => {
    const chain = buildChain([ElementType.Ice]);
    const analysis = analyzeChain(chain);
    const player = defaultPlayerState();
    const enemy = { id: 'e1', name: 'G', hp: { current: 50, max: 50 }, status: { burn: 0, slow: 0, frozen: false, stunned: false, poison: 0 } };
    applyChainEffects(analysis, player, enemy);
    expect(enemy.status.slow).toBe(1);
  });

  test('applyChainEffects applies freeze from 2+ Ice', () => {
    const chain = buildChain([ElementType.Ice, ElementType.Ice]);
    const analysis = analyzeChain(chain);
    const player = defaultPlayerState();
    const enemy = { id: 'e1', name: 'G', hp: { current: 50, max: 50 }, status: { burn: 0, slow: 0, frozen: false, stunned: false, poison: 0 } };
    const effects = applyChainEffects(analysis, player, enemy);
    expect(enemy.status.frozen).toBe(true);
    expect(effects.specialTriggered).toBe(true);
  });

  test('applyChainEffects gives lightning bonus', () => {
    const chain = buildChain([ElementType.Lightning, ElementType.Lightning]);
    const analysis = analyzeChain(chain);
    const player = defaultPlayerState();
    const enemy = { id: 'e1', name: 'G', hp: { current: 50, max: 50 }, status: { burn: 0, slow: 0, frozen: false, stunned: false, poison: 0 } };
    const effects = applyChainEffects(analysis, player, enemy);
    expect(effects.lightningBonus).toBe(6); // 2 * 3
  });

  test('applyChainEffects applies armor from Earth stones', () => {
    const chain = buildChain([ElementType.Earth, ElementType.Earth]);
    const analysis = analyzeChain(chain);
    const player = defaultPlayerState();
    const enemy = { id: 'e1', name: 'G', hp: { current: 50, max: 50 }, status: { burn: 0, slow: 0, frozen: false, stunned: false, poison: 0 } };
    applyChainEffects(analysis, player, enemy);
    expect(player.armor).toBe(6); // 2 * 3
  });

  test('applyChainEffects handles mixed elements', () => {
    const chain = buildChain([ElementType.Fire, ElementType.Ice, ElementType.Lightning]);
    const analysis = analyzeChain(chain);
    const player = defaultPlayerState();
    const enemy = { id: 'e1', name: 'G', hp: { current: 50, max: 50 }, status: { burn: 0, slow: 0, frozen: false, stunned: false, poison: 0 } };
    const effects = applyChainEffects(analysis, player, enemy);
    expect(effects.burnApplied).toBe(1);
    expect(effects.slowApplied).toBe(1);
    expect(effects.lightningBonus).toBe(3);
  });
});
