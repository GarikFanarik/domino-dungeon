import type { Stone } from '../models/stone';
import type { Board } from '../board';

export class EnemyBoardAI {
  /**
   * Plays tiles from `hand` onto `board` greedily until no more matches.
   * Returns the remaining tiles in hand.
   */
  playTurn(board: Board, hand: Stone[], turnNumber: number): Stone[] {
    const remaining = [...hand];

    while (true) {
      const best = this._bestPlay(board, remaining);
      if (!best) break;

      const idx = remaining.indexOf(best.stone);
      remaining.splice(idx, 1);

      board.playStone(best.stone, best.side, 'enemy', turnNumber);
    }

    return remaining;
  }

  private _bestPlay(
    board: Board,
    hand: Stone[]
  ): { stone: Stone; side: 'left' | 'right'; score: number } | null {
    let best: { stone: Stone; side: 'left' | 'right'; score: number } | null = null;

    for (const stone of hand) {
      const { left, right } = board.canPlay(stone);

      if (right) {
        const score = this._junctionPip(stone, 'right', board.rightOpen);
        if (!best || score > best.score || (score === best.score && best.side === 'left')) {
          best = { stone, side: 'right', score };
        }
      }

      if (left) {
        const score = this._junctionPip(stone, 'left', board.leftOpen);
        if (!best || score > best.score) {
          best = { stone, side: 'left', score };
        }
      }
    }

    return best;
  }

  private _junctionPip(
    stone: Stone,
    side: 'left' | 'right',
    openEnd: number | null
  ): number {
    if (openEnd === null) return 0;
    if (side === 'right') {
      return stone.rightPip === openEnd ? stone.rightPip : stone.leftPip;
    } else {
      return stone.leftPip === openEnd ? stone.leftPip : stone.rightPip;
    }
  }
}
