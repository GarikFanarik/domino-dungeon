import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { LoadingScreen } from '../screens/LoadingScreen';
import { GameProvider } from '../context/GameContext';

const mockNavigate = vi.fn();

vi.mock('../hooks/useDiscordSdk');
vi.mock('../context/GameContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../context/GameContext')>();
  return {
    ...actual,
    useGame: () => ({ navigate: mockNavigate }),
  };
});

import { useDiscordSdk } from '../hooks/useDiscordSdk';

function renderLoading() {
  return render(<GameProvider><LoadingScreen /></GameProvider>);
}

describe('LoadingScreen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows connecting message while loading', () => {
    vi.mocked(useDiscordSdk).mockReturnValue({ ready: false, error: null, auth: null });
    renderLoading();
    expect(screen.getByText(/connecting to discord/i)).toBeInTheDocument();
  });

  it('renders animated domino tiles while loading', () => {
    vi.mocked(useDiscordSdk).mockReturnValue({ ready: false, error: null, auth: null });
    renderLoading();
    expect(screen.getAllByTestId('loading-tile').length).toBeGreaterThan(0);
  });

  it('shows error message on SDK failure', () => {
    vi.mocked(useDiscordSdk).mockReturnValue({ ready: false, error: 'SDK init failed', auth: null });
    renderLoading();
    expect(screen.getByText(/sdk init failed/i)).toBeInTheDocument();
  });

  it('shows retry button on error', () => {
    vi.mocked(useDiscordSdk).mockReturnValue({ ready: false, error: 'SDK init failed', auth: null });
    renderLoading();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('retry button reloads the page', () => {
    vi.mocked(useDiscordSdk).mockReturnValue({ ready: false, error: 'oops', auth: null });
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', { value: { reload: reloadSpy }, writable: true });
    renderLoading();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('shows game title', () => {
    vi.mocked(useDiscordSdk).mockReturnValue({ ready: false, error: null, auth: null });
    renderLoading();
    expect(screen.getByText(/domino dungeon/i)).toBeInTheDocument();
  });
});
