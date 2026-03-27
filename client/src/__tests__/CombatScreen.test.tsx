import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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
  act: 1,
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
      tiles: [{ id: 't1', stone: { id: 's0', leftPip: 6, rightPip: 6, element: null }, flipped: false, side: 'right', playedBy: 'player', turnNumber: 1 }],
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

  it('drag-drop: stone that only matches left end plays on left without requiring flip', async () => {
    const boardLeftOnly = {
      ...mockBoard,
      tiles: [{ id: 't1', stone: { id: 's0', leftPip: 2, rightPip: 4, element: null }, flipped: false, side: 'right' as const, playedBy: 'player' as const, turnNumber: 1 }],
      orderedTiles: [],
      leftOpen: 2,
      rightOpen: 4,
    };
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          ...mockCombatState,
          board: boardLeftOnly,
          playerHand: [{ id: 's1', leftPip: 2, rightPip: 2, element: null }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ board: boardLeftOnly, hand: [], playerState: mockCombatState.playerState }),
      });

    renderCombat();
    await waitFor(() => screen.getByTitle('Stone (2|2)'));

    // Make getBoundingClientRect return a full-screen rect so overBoard check passes
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0, right: 9999, top: 0, bottom: 9999,
      width: 9999, height: 9999, x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect);

    // Start drag on the 2|2 hand tile (flipped=false → prefers right side, invalid for 2|2)
    const stoneTile = screen.getByTitle('Stone (2|2)');
    fireEvent.pointerDown(stoneTile, { clientX: 200, clientY: 200 });

    // Wait for drag overlay label to appear (confirms state update ran)
    await waitFor(() => {
      const overlay = document.querySelector('.drag-overlay');
      if (!overlay) throw new Error('drag overlay not yet rendered');
    });

    // Flush pending effects (ensures the useEffect registering pointerup listener has run)
    await act(async () => {});

    // Drop inside board zone without pressing R (no flip) — auto-selects valid side
    await act(async () => {
      window.dispatchEvent(new PointerEvent('pointerup', { clientX: 300, clientY: 300, bubbles: true }));
    });

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const playCall = calls.find(c => typeof c[0] === 'string' && c[0].includes('/combat/play'));
      expect(playCall).toBeDefined();
      const body = JSON.parse((playCall![1] as RequestInit).body as string);
      expect(body.side).toBe('left');
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
