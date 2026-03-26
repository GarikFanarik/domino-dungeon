import type { BoardJSON } from '../../../src/game/board';
import { DominoStone } from './DominoStone';
import './DominoBoard.css';

interface Props {
  board: BoardJSON;
  isPlayerTurn: boolean;
  choosingEnd: 'both' | null;
  onEndSelect: (side: 'left' | 'right') => void;
}

// Each tile occupies 2 x-cells wide, 1 y-cell tall
const CELL_W = 55; // px per x-grid-unit (tile spans 2 → ~110px)
const CELL_H = 76; // px per y-grid-unit (matches placed tile height)

export function DominoBoard({ board, isPlayerTurn, choosingEnd, onEndSelect }: Props) {
  const hasBoard = board.tiles.length > 0;

  // Show the area from 2 cells before leftHead to maxCol+2, y=2 to y=10
  const offsetX = Math.max(0, board.leftHead.x - 2);
  const offsetY = 2;
  const cols = Math.max(board.maxCol, board.rightHead.x + 4) - offsetX;
  const rows = 8;
  const gridW = cols * CELL_W;
  const gridH = rows * CELL_H;

  return (
    <div className="domino-board-scroll" data-testid="domino-board">
      <div
        className="domino-board-grid"
        style={{
          width: gridW,
          height: gridH,
          position: 'relative',
          backgroundSize: `${CELL_W}px ${CELL_H}px`,
        }}
      >
        {!hasBoard && (
          <div className="domino-board-empty">Play a tile to start the chain</div>
        )}

        {board.tiles.map(tile => {
          const displayStone = tile.flipped
            ? { ...tile.stone, leftPip: tile.stone.rightPip, rightPip: tile.stone.leftPip }
            : tile.stone;
          const isEnemy = tile.playedBy === 'enemy';
          const px = (tile.x - offsetX) * CELL_W;
          const py = (tile.y - offsetY) * CELL_H;
          return (
            <div
              key={tile.id}
              className={`board-tile ${isEnemy ? 'board-tile--enemy' : 'board-tile--player'}`}
              style={{ position: 'absolute', left: px, top: py }}
            >
              <DominoStone stone={displayStone} horizontal placed />
            </div>
          );
        })}

        {hasBoard && isPlayerTurn && board.leftOpen !== null && (
          <button
            data-testid="open-end-left"
            className={`open-end${choosingEnd === 'both' ? ' open-end--pulse' : ''}`}
            style={{
              position: 'absolute',
              left: (board.leftHead.x - offsetX - 1) * CELL_W + 4,
              top: (board.leftHead.y - offsetY) * CELL_H + CELL_H / 2 - 24,
            }}
            onClick={() => onEndSelect('left')}
          >
            {board.leftOpen}
          </button>
        )}

        {hasBoard && isPlayerTurn && board.rightOpen !== null && (
          <button
            data-testid="open-end-right"
            className={`open-end${choosingEnd === 'both' ? ' open-end--pulse' : ''}`}
            style={{
              position: 'absolute',
              left: (board.rightHead.x - offsetX) * CELL_W + 4,
              top: (board.rightHead.y - offsetY) * CELL_H + CELL_H / 2 - 24,
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
