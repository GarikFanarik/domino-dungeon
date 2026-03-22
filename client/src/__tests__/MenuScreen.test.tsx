import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MenuScreen } from '../screens/MenuScreen';
import { GameProvider } from '../context/GameContext';

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock useDiscordSdk
vi.mock('../hooks/useDiscordSdk', () => ({
  useDiscordSdk: vi.fn(() => ({
    ready: true,
    auth: { userId: 'user-123', username: 'TestUser', accessToken: 'token' },
    error: null,
  })),
}));

function renderMenu() {
  return render(
    <GameProvider>
      <MenuScreen />
    </GameProvider>
  );
}

describe('MenuScreen', () => {
  beforeEach(() => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ runId: null }),
    });
  });

  it('renders the game title', () => {
    renderMenu();
    expect(screen.getByText(/domino dungeon/i)).toBeInTheDocument();
  });

  it('shows the discord username', async () => {
    renderMenu();
    await waitFor(() => {
      expect(screen.getByText(/TestUser/i)).toBeInTheDocument();
    });
  });

  it('shows Start New Run button', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('shows Leaderboard button', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: /leaderboard/i })).toBeInTheDocument();
  });

  it('does not show Resume Run when no active run', async () => {
    renderMenu();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /resume/i })).not.toBeInTheDocument();
    });
  });

  it('shows Resume Run when active run exists', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ runId: 'run-123' }),
    });
    renderMenu();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
    });
  });
});
