import type { BoardJSON } from '../../../src/game/board';
import { DominoStone } from './DominoStone';
import './DominoBoard.css';

interface Props {
  board: BoardJSON;
  isPlayerTurn: boolean;
  dragValidEnds?: { left: boolean; right: boolean };
}

// Each tile occupies 2 x-cells wide, 1 y-cell tall
// Placed horizontal tile: height 72px, two halves at aspect-ratio 1 = 72px each,
// + padding 8*2 + gap 2*2 + divider 2 + border 2 = 132px wide → 66px per x-cell
const CELL_W = 66; // px per x-grid-unit (tile spans 2 → 132px)
const CELL_H = 76; // px per y-grid-unit (matches placed tile height ~72px + 4px gap)

export function DominoBoard({ board, isPlayerTurn: _isPlayerTurn, dragValidEnds }: Props) {
  const hasBoard = board.tiles.length > 0;

  // Show the area from 2 cells before leftHead to maxCol+2, y=2 to y=10
  const offsetX = Math.max(0, board.leftHead.x - 2);
  const offsetY = 2;
  const cols = Math.max(board.maxCol, board.rightHead.x + 4) - offsetX;
  const rows = 8;
  const gridW = cols * CELL_W;
  const gridH = rows * CELL_H;

  const isDragging = !!dragValidEnds;

  return (
    <div
      className={`domino-board-scroll${!hasBoard && isDragging ? ' domino-board-scroll--drag-valid' : ''}`}
      data-drop-zone="board"
      data-testid="domino-board"
    >
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

        {/* Valid end zone highlights during drag */}
        {hasBoard && isDragging && dragValidEnds!.left && (
          <div
            className="drag-valid-end drag-valid-end--left"
            style={{
              position: 'absolute',
              left: (board.leftHead.x - offsetX - 1) * CELL_W,
              top: (board.leftHead.y - offsetY) * CELL_H,
              width: CELL_W * 2,
              height: CELL_H,
            }}
          />
        )}
        {hasBoard && isDragging && dragValidEnds!.right && (
          <div
            className="drag-valid-end drag-valid-end--right"
            style={{
              position: 'absolute',
              left: (board.rightHead.x - offsetX) * CELL_W,
              top: (board.rightHead.y - offsetY) * CELL_H,
              width: CELL_W * 2,
              height: CELL_H,
            }}
          />
        )}
      </div>
    </div>
  );
}
