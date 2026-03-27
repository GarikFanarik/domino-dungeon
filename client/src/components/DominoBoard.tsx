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

/**
 * Tracks which tiles survived the last compression.
 * survivorIds: tiles kept after compressChain
 * baseIds:     all tiles that existed when compression ran
 *
 * New tiles (not in baseIds) are always shown regardless of survivorIds.
 */
interface CompressedState {
  survivorIds: Set<string>;
  baseIds: Set<string>;
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
  const [compressedState, setCompressedState] = useState<CompressedState | null>(null);
  const onAnimationDoneRef = useRef(onAnimationDone);
  onAnimationDoneRef.current = onAnimationDone;

  useEffect(() => {
    if (!prevOrderedTiles) return;

    // New End Turn starting — reset any previous compression state
    setCompressedState(null);

    const newTiles = board.orderedTiles;
    const prevIds = new Set(prevOrderedTiles.map(t => t.id));

    // Enemy tiles that weren't on the board before, in chain order
    const newEnemyTiles = newTiles.filter(t => !prevIds.has(t.id) && t.playedBy === 'enemy');

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Start: display only what was there before (no new enemy tiles yet)
    let currentDisplay = [...prevOrderedTiles];
    const revealedIds = new Set<string>();
    setAnimState({ displayTiles: currentDisplay, enteringIds: new Set(), exitingIds: new Set() });

    // Reveal each enemy tile one at a time, 1200ms apart
    newEnemyTiles.forEach((tile, i) => {
      const t = setTimeout(() => {
        revealedIds.add(tile.id);
        currentDisplay = newTiles.filter(t => prevIds.has(t.id) || revealedIds.has(t.id));
        setAnimState({
          displayTiles: currentDisplay,
          enteringIds: new Set([tile.id]),
          exitingIds: new Set(),
        });
      }, i * 1200);
      timeouts.push(t);
    });

    // After all enemy tiles have appeared (+400ms for last fade-in), run compression
    const revealDone = newEnemyTiles.length * 1200 + 400;

    const tCompress = setTimeout(() => {
      const compressed = compressChain(newTiles);
      const compressedIds = new Set(compressed.map(t => t.id));
      const exitingIds = new Set(newTiles.filter(t => !compressedIds.has(t.id)).map(t => t.id));

      setAnimState({ displayTiles: newTiles, enteringIds: new Set(), exitingIds });

      const tDone = setTimeout(() => {
        setCompressedState({
          survivorIds: compressedIds,
          baseIds: new Set(newTiles.map(t => t.id)),
        });
        setAnimState(null);
        onAnimationDoneRef.current?.();
      }, 300);
      timeouts.push(tDone);
    }, revealDone);
    timeouts.push(tCompress);

    return () => timeouts.forEach(clearTimeout);
    // Only re-run when prevOrderedTiles identity changes (set after End Turn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevOrderedTiles]);

  const hasBoard = board.orderedTiles.length > 0;
  const isDragging = !!dragValidEnds;

  let displayTiles: BoardTile[];
  if (animState) {
    displayTiles = animState.displayTiles;
  } else if (compressedState) {
    // Show survivors from compression + any new tiles played since
    displayTiles = board.orderedTiles.filter(
      t => compressedState.survivorIds.has(t.id) || !compressedState.baseIds.has(t.id)
    );
  } else {
    // Normal play: show full chain, no compression
    displayTiles = board.orderedTiles;
  }

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
