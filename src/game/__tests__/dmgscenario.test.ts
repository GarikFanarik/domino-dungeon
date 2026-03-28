/**
 * Integration damage scenarios — verify that enemy and player damage is computed
 * using the N-1 junction formula (only pips at tile boundaries count, not every tile's
 * board-connecting pip).
 */
import { Board } from '../board';
import { calculateDamage } from '../damage';

function stone(l: number, r: number) {
  return { id: `${l}-${r}-${Math.random()}`, leftPip: l, rightPip: r, element: null };
}

describe('Damage scenario: active junctions (cross-turn connections count)', () => {
  it('enemy [2|2] turn 1, player [2|3] turn 2: junction at pip 2 → 4 dmg', () => {
    const b = new Board();
    b.playStone(stone(2, 2), 'right', 'enemy', 1);
    b.playStone(stone(2, 3), 'right', 'player', 2);
    expect(b.activeDamageForTurn(2, 'player')).toBe(4); // junction pip=2, 2×2=4
  });

  it('enemy [3|5] turn 1, player [5|4] turn 2 connecting both sides: two junctions (5, 4) → 18 dmg', () => {
    const b = new Board();
    b.playStone(stone(3, 5), 'right', 'enemy', 1);
    b.playStone(stone(5, 4), 'right', 'player', 2);
    b.playStone(stone(4, 2), 'right', 'enemy', 2);
    // active junctions for player turn 2: (5,4)→5×2=10 and (4,2)→4×2=8 but [4|2] is enemy not player
    // junction pip 5 (enemy-t1 / player-t2): active; junction pip 4 (player-t2 / enemy-t2): active (player tile on left)
    expect(b.activeDamageForTurn(2, 'player')).toBe(18); // (5+4)×2=18
  });

  it('pre-existing enemy junctions do NOT carry over to player active damage', () => {
    const b = new Board();
    // Two enemy tiles on turn 1 create a junction at pip 5
    b.playStone(stone(3, 5), 'right', 'enemy', 1);
    b.playStone(stone(5, 2), 'right', 'enemy', 1);
    // Player plays one tile on turn 2 connecting at pip 2
    b.playStone(stone(2, 6), 'right', 'player', 2);
    // Player's active damage = only junction at pip 2 (NOT the existing pip-5 junction)
    expect(b.activeDamageForTurn(2, 'player')).toBe(4); // only 2×2=4
  });
});

describe('Damage scenario: N-1 junction formula', () => {
  it('enemy [2|4]-[4|1]: one junction at pip 4 → rawDamage = 8', () => {
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'enemy', 1);
    b.playStone(stone(4, 1), 'right', 'enemy', 1);
    const chain = b.toChainForTurn(1, 'enemy');
    const { finalDamage } = calculateDamage(chain, {} as any);
    expect(finalDamage).toBe(8); // junction pip=4, 4×2=8
  });

  it('enemy [3|5]-[5|2]-[2|6]: two junctions (pip 5, pip 2) → rawDamage = 14', () => {
    const b = new Board();
    b.playStone(stone(3, 5), 'right', 'enemy', 1);
    b.playStone(stone(5, 2), 'right', 'enemy', 1);
    b.playStone(stone(2, 6), 'right', 'enemy', 1);
    const chain = b.toChainForTurn(1, 'enemy');
    const { finalDamage } = calculateDamage(chain, {} as any);
    expect(finalDamage).toBe(14); // (5+2)×2=14
  });

  it('player [4|5]-[5|4]-[4|5]: two junctions (pip 5, pip 4) → finalDamage = 18', () => {
    const b = new Board();
    b.playStone(stone(4, 5), 'right', 'player', 1);
    b.playStone(stone(5, 4), 'left', 'player', 1);
    b.playStone(stone(4, 5), 'left', 'player', 1);
    const chain = b.toChainForTurn(1, 'player');
    const { finalDamage } = calculateDamage(chain, {} as any);
    expect(finalDamage).toBe(18); // (5+4)×2=18
  });

  it('single enemy tile [3|6]: no junctions → rawDamage = 0', () => {
    const b = new Board();
    b.playStone(stone(3, 6), 'right', 'enemy', 1);
    const chain = b.toChainForTurn(1, 'enemy');
    const { finalDamage } = calculateDamage(chain, {} as any);
    expect(finalDamage).toBe(0); // 0 junctions
  });
});
