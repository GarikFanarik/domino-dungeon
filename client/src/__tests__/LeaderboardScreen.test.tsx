import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { GameProvider } from '../context/GameContext';

global.fetch = vi.fn();

const mockEntries = [
  { rank: 1, discordUserId: 'u1', displayName: 'DragonSlayer', score: 8450, actsCleared: 3, enemiesDefeated: 28, runDate: '2026-03-20' },
  { rank: 2, discordUserId: 'u2', displayName: 'StoneWielder', score: 7200, actsCleared: 3, enemiesDefeated: 21, runDate: '2026-03-19' },
];

function renderLeaderboard() {
  return render(<GameProvider><LeaderboardScreen /></GameProvider>);
}

describe('LeaderboardScreen', () => {
  beforeEach(() => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, json: vi.fn().mockResolvedValue({ entries: mockEntries }),
    });
  });

  it('renders leaderboard title', () => {
    renderLeaderboard();
    expect(screen.getByText(/leaderboard/i)).toBeInTheDocument();
  });

  it('shows player names after loading', async () => {
    renderLeaderboard();
    await waitFor(() => {
      expect(screen.getByText('DragonSlayer')).toBeInTheDocument();
      expect(screen.getByText('StoneWielder')).toBeInTheDocument();
    });
  });

  it('shows player scores', async () => {
    renderLeaderboard();
    await waitFor(() => expect(screen.getByText('8450')).toBeInTheDocument());
  });

  it('shows empty state when no entries', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, json: vi.fn().mockResolvedValue({ entries: [] }),
    });
    renderLeaderboard();
    await waitFor(() => expect(screen.getByText(/no runs yet/i)).toBeInTheDocument());
  });

  it('shows Back button', () => {
    renderLeaderboard();
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });
});
