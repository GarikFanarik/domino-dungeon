import type { BoardJSON } from '../../../src/game/board';
import { DominoStone } from './DominoStone';
import './DominoBoard.css';

interface Props {
  board: BoardJSON;
  isPlayerTurn: boolean;
  /** null = not choosing; 'both' = choosing between left and right */
  choosingEnd: 'both' | null;
  onEndSelect: (side: 'left' | 'right') => void;
}

export function DominoBoard({ board, isPlayerTurn, choosingEnd, onEndSelect }: Props) {
  const hasBoard = board.orderedTiles.length > 0;

  return (
    <div className="domino-board" data-testid="domino-board">
      {!hasBoard && (
        <div className="domino-board-empty">Play a tile to start the chain</div>
      )}

      {hasBoard && (
        <div className="domino-board-chain">
          {isPlayerTurn && board.leftOpen !== null && (
            <button
              data-testid="open-end-left"
              className={`open-end${choosingEnd === 'both' ? ' open-end--pulse' : ''}`}
              onClick={() => onEndSelect('left')}
            >
              {board.leftOpen}
            </button>
          )}

          {board.orderedTiles.map(tile => {
            const displayStone = tile.flipped
              ? { ...tile.stone, leftPip: tile.stone.rightPip, rightPip: tile.stone.leftPip }
              : tile.stone;
            const isEnemy = tile.playedBy === 'enemy';
            return (
              <div
                key={tile.id}
                className={`board-tile ${isEnemy ? 'board-tile--enemy' : 'board-tile--player'}`}
              >
                <DominoStone stone={displayStone} horizontal placed />
                {isEnemy && <span className="board-tile-owner">enemy</span>}
              </div>
            );
          })}

          {isPlayerTurn && board.rightOpen !== null && (
            <button
              data-testid="open-end-right"
              className={`open-end${choosingEnd === 'both' ? ' open-end--pulse' : ''}`}
              onClick={() => onEndSelect('right')}
            >
              {board.rightOpen}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
