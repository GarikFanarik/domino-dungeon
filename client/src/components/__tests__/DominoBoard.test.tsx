import { render, screen } from '@testing-library/react';
import { DominoBoard } from '../DominoBoard';
import type { BoardJSON } from '../../../../src/game/board'; // 4 levels up to repo root

function emptyBoard(): BoardJSON {
  return {
    tiles: [],
    orderedTiles: [],
    leftOpen: null,
    rightOpen: null,
    rightHead: { x: 12, y: 4, dir: 'right' },
    leftHead: { x: 8, y: 4, dir: 'left' },
    maxCol: 20,
  };
}

function tileAt(x: number, y: number, leftPip: number, rightPip: number): BoardJSON['tiles'][number] {
  return {
    id: `t-${x}-${y}`,
    stone: { id: 's1', leftPip, rightPip, element: null },
    x, y,
    orientation: 'h',
    flipped: false,
    side: 'right',
    playedBy: 'player',
    turnNumber: 1,
  };
}

describe('DominoBoard', () => {
  it('renders without crashing on empty board', () => {
    render(<DominoBoard board={emptyBoard()} isPlayerTurn={true} onEndSelect={() => {}} choosingEnd={null} />);
    expect(screen.getByTestId('domino-board')).toBeInTheDocument();
  });

  it('renders a tile when board has one tile', () => {
    const board = emptyBoard();
    board.tiles = [tileAt(10, 4, 2, 4)];
    board.orderedTiles = board.tiles;
    board.leftOpen = 2;
    board.rightOpen = 4;
    render(<DominoBoard board={board} isPlayerTurn={true} onEndSelect={() => {}} choosingEnd={null} />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('highlights open ends when isPlayerTurn is true', () => {
    const board = emptyBoard();
    board.tiles = [tileAt(10, 4, 2, 4)];
    board.orderedTiles = board.tiles;
    board.leftOpen = 2;
    board.rightOpen = 4;
    render(<DominoBoard board={board} isPlayerTurn={true} onEndSelect={() => {}} choosingEnd={null} />);
    expect(screen.getByTestId('open-end-left')).toBeInTheDocument();
    expect(screen.getByTestId('open-end-right')).toBeInTheDocument();
  });

  it('does not highlight open ends during enemy turn', () => {
    const board = emptyBoard();
    board.tiles = [tileAt(10, 4, 2, 4)];
    board.orderedTiles = board.tiles;
    board.leftOpen = 2;
    board.rightOpen = 4;
    render(<DominoBoard board={board} isPlayerTurn={false} onEndSelect={() => {}} choosingEnd={null} />);
    expect(screen.queryByTestId('open-end-left')).not.toBeInTheDocument();
  });

  it('calls onEndSelect with side when an open end is clicked', async () => {
    const board = emptyBoard();
    board.tiles = [tileAt(10, 4, 2, 4)];
    board.orderedTiles = board.tiles;
    board.leftOpen = 2;
    board.rightOpen = 4;
    const onEndSelect = vi.fn();
    const { getByTestId } = render(
      <DominoBoard board={board} isPlayerTurn={true} onEndSelect={onEndSelect} choosingEnd="both" />
    );
    getByTestId('open-end-right').click();
    expect(onEndSelect).toHaveBeenCalledWith('right');
  });
});
