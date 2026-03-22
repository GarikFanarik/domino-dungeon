import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { CombatScreen } from '../screens/CombatScreen';
import { GameProvider } from '../context/GameContext';

// Mock fetch
global.fetch = vi.fn();

const mockCombatState = {
  enemy: { name: 'Cave Troll', hp: 40, maxHp: 40, status: {} },
  playerHand: [
    { id: 's1', leftPip: 2, rightPip: 3, element: null },
    { id: 's2', leftPip: 0, rightPip: 5, element: 'fire' },
    { id: 's3', leftPip: 3, rightPip: 6, element: null },
  ],
  chain: [],
  playerState: { hp: 60, maxHp: 80, gold: 45, armor: 0, swapsUsed: 0, swapsPerTurn: 2, relics: [], effects: {} },
  turnNumber: 1,
  phase: 'player-turn',
};

function renderCombat(runId = 'run-123') {
  // We need runId in context - set it via a wrapper
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
      expect(screen.getByText(/cave troll/i)).toBeInTheDocument();
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

  it('clicking invalid stone (no chain) shows error message', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockCombatState),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Stone does not match chain' }),
      });

    renderCombat();
    await waitFor(() => screen.getByText(/2\|3/));

    fireEvent.click(screen.getByText(/2\|3/));
    await waitFor(() => {
      expect(screen.getByText(/stone does not match chain/i)).toBeInTheDocument();
    });
  });
});
