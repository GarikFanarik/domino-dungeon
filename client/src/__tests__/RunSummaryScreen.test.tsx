import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { RunSummaryScreen } from '../screens/RunSummaryScreen';
import { GameProvider } from '../context/GameContext';

global.fetch = vi.fn();

const mockWinSummary = {
  status: 'COMPLETED',
  actsCleared: 3,
  enemiesDefeated: 21,
  totalDamage: 2847,
  relicsCollected: 4,
  goldEarned: 185,
  score: 8050,
};

const mockLoseSummary = {
  status: 'FAILED',
  actsCleared: 1,
  enemiesDefeated: 5,
  totalDamage: 420,
  relicsCollected: 1,
  goldEarned: 45,
  causeOfDeath: 'Poison DoT',
  score: 1250,
};

function renderSummary(runId = 'run-123') {
  return render(<GameProvider><RunSummaryScreen runId={runId} /></GameProvider>);
}

describe('RunSummaryScreen', () => {
  it('shows win message for COMPLETED status', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, json: vi.fn().mockResolvedValue(mockWinSummary),
    });
    renderSummary();
    await waitFor(() => expect(screen.getByText(/run complete/i)).toBeInTheDocument());
  });

  it('shows defeat message for FAILED status', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, json: vi.fn().mockResolvedValue(mockLoseSummary),
    });
    renderSummary();
    await waitFor(() => expect(screen.getByText(/you died/i)).toBeInTheDocument());
  });

  it('displays score', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, json: vi.fn().mockResolvedValue(mockWinSummary),
    });
    renderSummary();
    await waitFor(() => expect(screen.getByText(/8[,.]?050/)).toBeInTheDocument());
  });

  it('shows cause of death on FAILED', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, json: vi.fn().mockResolvedValue(mockLoseSummary),
    });
    renderSummary();
    await waitFor(() => expect(screen.getByText(/poison dot/i)).toBeInTheDocument());
  });

  it('shows Play Again and Leaderboard buttons', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, json: vi.fn().mockResolvedValue(mockWinSummary),
    });
    renderSummary();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /leaderboard/i })).toBeInTheDocument();
    });
  });
});
