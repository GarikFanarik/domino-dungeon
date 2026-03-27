import { render, screen } from '@testing-library/react';
import { DominoBoard } from '../DominoBoard';
import type { BoardJSON } from '../../../../src/game/board'; // 4 levels up to repo root

function emptyBoard(): BoardJSON {
  return {
    tiles: [],
    orderedTiles: [],
    leftOpen: null,
    rightOpen: null,
  };
}

function makeTile(leftPip: number, rightPip: number, id = 't1'): BoardJSON['tiles'][number] {
  return {
    id,
    stone: { id: 's1', leftPip, rightPip, element: null },
    flipped: false,
    side: 'right',
    playedBy: 'player',
    turnNumber: 1,
  };
}

describe('DominoBoard', () => {
  it('renders without crashing on empty board', () => {
    render(<DominoBoard board={emptyBoard()} isPlayerTurn={true} />);
    expect(screen.getByTestId('domino-board')).toBeInTheDocument();
  });

  it('does not highlight open ends during enemy turn', () => {
    const board = emptyBoard();
    board.tiles = [makeTile(2, 4)];
    board.orderedTiles = board.tiles;
    board.leftOpen = 2;
    board.rightOpen = 4;
    render(<DominoBoard board={board} isPlayerTurn={false} />);
    expect(screen.queryByTestId('open-end-left')).not.toBeInTheDocument();
  });

  it('shows drag-valid-end--left when dragValidEnds.left is true', () => {
    const board = emptyBoard();
    board.tiles = [makeTile(2, 4)];
    board.orderedTiles = board.tiles;
    board.leftOpen = 2;
    board.rightOpen = 4;
    render(<DominoBoard board={board} isPlayerTurn={true} dragValidEnds={{ left: true, right: false }} />);
    expect(document.querySelector('.drag-valid-end--left')).toBeInTheDocument();
    expect(document.querySelector('.drag-valid-end--right')).not.toBeInTheDocument();
  });

  it('shows drag-valid-end--right when dragValidEnds.right is true', () => {
    const board = emptyBoard();
    board.tiles = [makeTile(2, 4)];
    board.orderedTiles = board.tiles;
    board.leftOpen = 2;
    board.rightOpen = 4;
    render(<DominoBoard board={board} isPlayerTurn={true} dragValidEnds={{ left: false, right: true }} />);
    expect(document.querySelector('.drag-valid-end--right')).toBeInTheDocument();
    expect(document.querySelector('.drag-valid-end--left')).not.toBeInTheDocument();
  });

  it('shows neither drag-valid-end when dragValidEnds is undefined', () => {
    const board = emptyBoard();
    board.tiles = [makeTile(2, 4)];
    board.orderedTiles = board.tiles;
    board.leftOpen = 2;
    board.rightOpen = 4;
    render(<DominoBoard board={board} isPlayerTurn={true} />);
    expect(document.querySelector('.drag-valid-end--left')).not.toBeInTheDocument();
    expect(document.querySelector('.drag-valid-end--right')).not.toBeInTheDocument();
  });

});
