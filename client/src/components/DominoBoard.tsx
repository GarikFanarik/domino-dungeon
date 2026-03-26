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

const CELL_W = 56; // px per grid column
const CELL_H = 72; // px per grid row

export function DominoBoard({ board, isPlayerTurn, choosingEnd, onEndSelect }: Props) {
  const gridWidth = Math.max(board.maxCol, 20) * CELL_W;
  const gridHeight = 8 * CELL_H;

  const hasBoard = board.tiles.length > 0;

  return (
    <div className="domino-board-scroll" data-testid="domino-board">
      <div className="domino-board-grid" style={{ width: gridWidth, height: gridHeight, position: 'relative' }}>
        {board.tiles.map(tile => {
          const displayStone = tile.flipped
            ? { ...tile.stone, leftPip: tile.stone.rightPip, rightPip: tile.stone.leftPip }
            : tile.stone;
          const isEnemy = tile.playedBy === 'enemy';
          return (
            <div
              key={tile.id}
              style={{
                position: 'absolute',
                left: tile.x * CELL_W,
                top: tile.y * CELL_H,
              }}
              className={`board-tile ${isEnemy ? 'board-tile--enemy' : 'board-tile--player'}`}
            >
              <DominoStone stone={displayStone} horizontal placed />
            </div>
          );
        })}

        {/* Open end indicators */}
        {hasBoard && isPlayerTurn && board.leftOpen !== null && (
          <button
            data-testid="open-end-left"
            className={`open-end open-end--left${choosingEnd === 'both' ? ' open-end--pulse' : ''}`}
            style={{
              position: 'absolute',
              left: board.leftHead.x * CELL_W - CELL_W,
              top: board.leftHead.y * CELL_H,
            }}
            onClick={() => onEndSelect('left')}
          >
            {board.leftOpen}
          </button>
        )}
        {hasBoard && isPlayerTurn && board.rightOpen !== null && (
          <button
            data-testid="open-end-right"
            className={`open-end open-end--right${choosingEnd === 'both' ? ' open-end--pulse' : ''}`}
            style={{
              position: 'absolute',
              left: board.rightHead.x * CELL_W,
              top: board.rightHead.y * CELL_H,
            }}
            onClick={() => onEndSelect('right')}
          >
            {board.rightOpen}
          </button>
        )}
      </div>
    </div>
  );
}
