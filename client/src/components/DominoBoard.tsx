import { useEffect, useRef, useState } from 'react';
import type { BoardJSON, BoardTile } from '../../../src/game/board';
import { compressChain } from '../../../src/game/board';
import { DominoStone } from './DominoStone';
import './DominoBoard.css';

interface Props {
  board: BoardJSON;
  isPlayerTurn: boolean;
  dragValidEnds?: { left: boolean; right: boolean };
  /**
   * Set to the board's orderedTiles from BEFORE the End Turn to trigger the
   * two-phase animation: enemy tiles fade in, then removed tiles compress out.
   * Leave undefined when not animating.
   */
  prevOrderedTiles?: BoardTile[];
  /** Called when the animation sequence finishes. */
  onAnimationDone?: () => void;
}

interface AnimState {
  displayTiles: BoardTile[];
  enteringIds: Set<string>;
  exitingIds: Set<string>;
}

function displayStone(tile: BoardTile) {
  return tile.flipped
    ? { ...tile.stone, leftPip: tile.stone.rightPip, rightPip: tile.stone.leftPip }
    : tile.stone;
}

export function DominoBoard({
  board,
  isPlayerTurn: _isPlayerTurn,
  dragValidEnds,
  prevOrderedTiles,
  onAnimationDone,
}: Props) {
  const [animState, setAnimState] = useState<AnimState | null>(null);
  const onAnimationDoneRef = useRef(onAnimationDone);
  onAnimationDoneRef.current = onAnimationDone;

  useEffect(() => {
    if (!prevOrderedTiles) return;

    const newTiles = board.orderedTiles;
    const prevIds = new Set(prevOrderedTiles.map(t => t.id));

    // Phase 1: fade in new enemy tiles
    const enteringIds = new Set(
      newTiles.filter(t => !prevIds.has(t.id) && t.playedBy === 'enemy').map(t => t.id)
    );

    setAnimState({ displayTiles: newTiles, enteringIds, exitingIds: new Set() });

    const t1 = setTimeout(() => {
      // Phase 2: compress — fade out removed tiles
      const compressed = compressChain(newTiles);
      const compressedIds = new Set(compressed.map(t => t.id));
      const exitingIds = new Set(newTiles.filter(t => !compressedIds.has(t.id)).map(t => t.id));

      setAnimState({ displayTiles: newTiles, enteringIds: new Set(), exitingIds });

      const t2 = setTimeout(() => {
        setAnimState(null);
        onAnimationDoneRef.current?.();
      }, 300);

      return () => clearTimeout(t2);
    }, 400);

    return () => clearTimeout(t1);
    // Only re-run when prevOrderedTiles identity changes (set after End Turn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevOrderedTiles]);

  const hasBoard = board.orderedTiles.length > 0;
  const isDragging = !!dragValidEnds;

  const displayTiles = animState
    ? animState.displayTiles
    : hasBoard ? compressChain(board.orderedTiles) : [];

  return (
    <div
      className={`domino-board-scroll${!hasBoard && isDragging ? ' domino-board-scroll--drag-valid' : ''}`}
      data-drop-zone="board"
      data-testid="domino-board"
    >
      <div className="domino-board-chain">
        {!hasBoard && (
          <div className="domino-board-empty">Play a tile to start the chain</div>
        )}

        {/* Left drag-valid-end sibling */}
        {hasBoard && isDragging && dragValidEnds!.left && (
          <div className="drag-valid-end drag-valid-end--left" />
        )}

        {displayTiles.map((tile, i) => {
          const isLast = i === displayTiles.length - 1;
          const isEnemy = tile.playedBy === 'enemy';
          const isEntering = animState?.enteringIds.has(tile.id);
          const isExiting = animState?.exitingIds.has(tile.id);

          let cls = 'board-tile';
          cls += isEnemy ? ' board-tile--enemy' : ' board-tile--player';
          if (isEntering) cls += ' board-tile--entering';
          if (isExiting) cls += ' board-tile--exiting';
          if (!isLast) cls += ' board-tile--no-right-border';

          return (
            <div key={tile.id} className={cls}>
              <DominoStone stone={displayStone(tile)} horizontal placed />
            </div>
          );
        })}

        {/* Right drag-valid-end sibling */}
        {hasBoard && isDragging && dragValidEnds!.right && (
          <div className="drag-valid-end drag-valid-end--right" />
        )}
      </div>
    </div>
  );
}
