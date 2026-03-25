import { randomUUID } from 'crypto';
import { Board } from '../../board';
import { EnemyBoardAI } from '../enemy-board-ai';
import type { Stone } from '../../models/stone';

function stone(leftPip: number, rightPip: number): Stone {
  return { id: randomUUID(), leftPip, rightPip, element: null };
}

describe('EnemyBoardAI.playTurn', () => {
  it('plays a matching tile onto the board and removes it from hand', () => {
    const board = new Board();
    board.playStone(stone(1, 3), 'right', 'player', 1); // rightOpen=3, leftOpen=1
    const hand: Stone[] = [stone(3, 5)]; // leftPip=3 matches rightOpen
    const ai = new EnemyBoardAI();
    const remaining = ai.playTurn(board, hand, 1);
    expect(remaining).toHaveLength(0);
    expect(board.toJSON().tiles).toHaveLength(2);
  });

  it('plays multiple tiles in one call', () => {
    const board = new Board();
    board.playStone(stone(1, 3), 'right', 'player', 1); // rightOpen=3
    const hand: Stone[] = [stone(3, 5), stone(5, 2)]; // chain: rightOpen→5→2
    const ai = new EnemyBoardAI();
    const remaining = ai.playTurn(board, hand, 1);
    expect(remaining).toHaveLength(0);
    expect(board.toJSON().tiles).toHaveLength(3);
  });

  it('stops and returns remaining tiles when no more matches', () => {
    const board = new Board();
    board.playStone(stone(1, 3), 'right', 'player', 1); // rightOpen=3
    const hand: Stone[] = [stone(3, 5), stone(0, 0)]; // second tile can't connect after first
    const ai = new EnemyBoardAI();
    const remaining = ai.playTurn(board, hand, 1);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].leftPip).toBe(0);
  });

  it('returns full hand unchanged when no tiles are playable', () => {
    const board = new Board();
    board.playStone(stone(1, 3), 'right', 'player', 1); // rightOpen=3
    const hand: Stone[] = [stone(0, 0), stone(6, 6)];
    const ai = new EnemyBoardAI();
    const remaining = ai.playTurn(board, hand, 1);
    expect(remaining).toHaveLength(2);
  });

  it('prefers the end with the highest junction pip', () => {
    // leftOpen=2, rightOpen=5 — hand has stone [5|2] which matches both
    const board = new Board();
    board.playStone(stone(2, 5), 'right', 'player', 1); // leftOpen=2, rightOpen=5
    const hand: Stone[] = [stone(5, 2)]; // leftPip=5→rightOpen(5); rightPip=2→leftOpen(2)
    // right junction pip = 5, left junction pip = 2 → prefer right
    const ai = new EnemyBoardAI();
    ai.playTurn(board, hand, 1);
    const enemyTile = board.toJSON().tiles.find(t => t.playedBy === 'enemy')!;
    expect(enemyTile.side).toBe('right');
  });

  it('prefers right on tie', () => {
    // Both ends have the same pip value
    const board = new Board();
    board.playStone(stone(3, 3), 'right', 'player', 1); // leftOpen=3, rightOpen=3
    const hand: Stone[] = [stone(3, 1)]; // matches both ends equally (pip=3)
    const ai = new EnemyBoardAI();
    ai.playTurn(board, hand, 1);
    const enemyTile = board.toJSON().tiles.find(t => t.playedBy === 'enemy')!;
    expect(enemyTile.side).toBe('right');
  });
});
