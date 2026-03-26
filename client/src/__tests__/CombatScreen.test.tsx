import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { CombatScreen } from '../screens/CombatScreen';
import { GameProvider } from '../context/GameContext';

// Mock fetch
global.fetch = vi.fn();

const mockBoard = {
  tiles: [],
  orderedTiles: [],
  leftOpen: null,
  rightOpen: null,
  rightHead: { x: 12, y: 4, dir: 'right' as const },
  leftHead: { x: 8, y: 4, dir: 'left' as const },
  maxCol: 20,
};

const mockCombatState = {
  enemy: {
    id: 'goblin',
    name: 'Goblin',
    hp: { current: 30, max: 30 },
    status: { burn: 0, slow: 0, frozen: false, stunned: false, poison: 0 },
  },
  playerHand: [
    { id: 's1', leftPip: 2, rightPip: 3, element: null },
    { id: 's2', leftPip: 0, rightPip: 5, element: 'fire' },
    { id: 's3', leftPip: 3, rightPip: 6, element: null },
  ],
  board: mockBoard,
  enemyHandCount: 5,
  playerState: { hp: { current: 80, max: 80 }, armor: 0, gold: 0, relics: [] },
  turnNumber: 1,
  phase: 'player-turn',
  swapsUsed: 0,
  swapsPerTurn: 1,
  bag: [],
};

function renderCombat(runId = 'run-123') {
  return render(
    <GameProvider>
      <CombatScreen runId={runId} />
    </GameProvider>
  );
}

describe('CombatScreen', () => {
  beforeEach(() => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockCombatState),
    });
  });

  it('renders enemy name after loading', async () => {
    renderCombat();
    await waitFor(() => {
      expect(screen.getByText(/goblin/i)).toBeInTheDocument();
    });
  });

  it('renders player hand stones', async () => {
    renderCombat();
    await waitFor(() => {
      // Stones shown as [left|right]
      expect(screen.getByText(/2\|3/)).toBeInTheDocument();
    });
  });

  it('shows End Turn button', async () => {
    renderCombat();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /end turn/i })).toBeInTheDocument();
    });
  });

  it('End Turn button disabled during enemy-turn phase', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ...mockCombatState, phase: 'enemy-turn' }),
    });
    renderCombat();
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /end turn/i });
      expect(btn).toBeDisabled();
    });
  });

  it('clicking invalid stone (no open end) does not send request', async () => {
    // Board is empty (no tiles), stone [2,3] — canStonePlay returns { left: false, right: true }
    // so stone IS playable on first play (right side). Let's use a board with tiles and mismatched pips.
    const boardWithMismatch = {
      ...mockBoard,
      tiles: [{ id: 't1', stone: { id: 's0', leftPip: 6, rightPip: 6, element: null }, x: 10, y: 4, orientation: 'h', flipped: false, side: 'right', playedBy: 'player', turnNumber: 1 }],
      orderedTiles: [],
      leftOpen: 6,
      rightOpen: 6,
    };
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          ...mockCombatState,
          board: boardWithMismatch,
          playerHand: [{ id: 's1', leftPip: 1, rightPip: 2, element: null }],
        }),
      });

    renderCombat();
    await waitFor(() => screen.getByText(/1\|2/));

    // Stone [1,2] cannot match open ends of 6,6 — so click should be a no-op
    const fetchCallsBefore = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    fireEvent.click(screen.getByText(/1\|2/));
    // Give time for any async operations
    await new Promise(r => setTimeout(r, 50));
    const fetchCallsAfter = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(fetchCallsAfter).toBe(fetchCallsBefore);
  });

  it('renders enemy hand count label', async () => {
    renderCombat();
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('renders hero HP bar below hero portrait', async () => {
    renderCombat();
    await waitFor(() => {
      // The hero HP display (current/max) should be present
      expect(screen.getByText(/80\s*\/\s*80/)).toBeInTheDocument();
    });
  });

  it('End Turn button is present', async () => {
    renderCombat();
    await waitFor(() => {
      expect(screen.getByTestId('end-turn-btn')).toBeInTheDocument();
    });
  });

  it('choose-end mode: clicking a stone that matches both ends enters choosing state', async () => {
    const boardBothEnds = {
      ...mockBoard,
      tiles: [{ id: 't1', stone: { id: 's0', leftPip: 3, rightPip: 3, element: null }, x: 10, y: 4, orientation: 'h', flipped: false, side: 'right', playedBy: 'player', turnNumber: 1 }],
      orderedTiles: [{ id: 't1', stone: { id: 's0', leftPip: 3, rightPip: 3, element: null }, x: 10, y: 4, orientation: 'h' as const, flipped: false, side: 'right' as const, playedBy: 'player' as const, turnNumber: 1 }],
      leftOpen: 3,
      rightOpen: 3,
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ...mockCombatState,
        board: boardBothEnds,
        playerHand: [{ id: 's1', leftPip: 3, rightPip: 1, element: null }],
      }),
    });

    renderCombat();
    await waitFor(() => screen.getByText(/3\|1/));

    // Click the stone — both ends match (leftPip=3 matches leftOpen=3, leftPip=3 matches rightOpen=3)
    fireEvent.click(screen.getByText(/3\|1/));

    // Open-end buttons should appear
    await waitFor(() => {
      expect(screen.getByTestId('open-end-left')).toBeInTheDocument();
      expect(screen.getByTestId('open-end-right')).toBeInTheDocument();
    });
  });

  it('enemy hand count does not expose pip values', async () => {
    renderCombat();
    await waitFor(() => {
      // EnemyHand renders face-down tiles — no pip-value testids
      expect(screen.queryByTestId('pip-value')).not.toBeInTheDocument();
    });
  });
});
