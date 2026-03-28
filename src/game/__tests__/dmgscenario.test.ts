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

describe('perTileDamageForTurn: progressive damage display weights', () => {
  it('two right-side tiles: first tile 0, second tile gets the junction', () => {
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'enemy', 1);
    b.playStone(stone(4, 1), 'right', 'enemy', 1);
    // Chain: [2|4]-[4|1]. Junction at pip 4 → [4|1].leftDisplayPip × 2 = 4×2=8
    expect(b.perTileDamageForTurn(1, 'enemy')).toEqual([0, 8]);
  });

  it('right then left: RIGHT tile gets 0 (was first on empty board), LEFT tile gets the junction', () => {
    // This was the bug: old code gave [8, 0] (showed full dmg at first reveal)
    const b = new Board();
    b.playStone(stone(2, 4), 'right', 'enemy', 1); // play order 0
    b.playStone(stone(2, 3), 'left', 'enemy', 1);  // play order 1 — connects at leftPip=2
    // Chain order: [[2|3], [2|4]]. rightNeighbor of [2|3] = [2|4], ldp([2|4])=2 (flipped=false,leftPip=2)
    // Play order: [[2|4], [2|3]]
    // [2|4] (right, play=0): left neighbor in chain = [2|3] which was placed AFTER → 0
    // [2|3] (left, play=1): right neighbor = [2|4]. ldp([2|4])=2. contrib = 2×2=4
    expect(b.perTileDamageForTurn(1, 'enemy')).toEqual([0, 4]);
  });

  it('left then right: LEFT tile connects to pre-existing, RIGHT tile connects to pre-existing too', () => {
    // Pre-existing player tile [3|5] from turn 1
    const b = new Board();
    b.playStone(stone(3, 5), 'right', 'player', 1);
    // Enemy turn 2: play [5|2] right, then [3|1] left
    b.playStone(stone(5, 2), 'right', 'enemy', 2); // connects at pip 5 → ldp=5 → contrib=10
    b.playStone(stone(3, 1), 'left', 'enemy', 2);  // connects at pre-existing [3|5].ldp=3 → contrib=6
    // play order: [[5|2], [3|1]]
    expect(b.perTileDamageForTurn(2, 'enemy')).toEqual([10, 6]);
  });

  it('sum of perTileDamage equals activeDamageForTurn', () => {
    const b = new Board();
    b.playStone(stone(3, 5), 'right', 'player', 1);
    b.playStone(stone(5, 2), 'right', 'enemy', 2);
    b.playStone(stone(2, 6), 'right', 'enemy', 2);
    b.playStone(stone(3, 1), 'left', 'enemy', 2);
    const perTile = b.perTileDamageForTurn(2, 'enemy');
    const sum = perTile.reduce((a, v) => a + v, 0);
    expect(sum).toBe(b.activeDamageForTurn(2, 'enemy'));
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
