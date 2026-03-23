import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { LoadingScreen } from '../screens/LoadingScreen';
import { GameProvider } from '../context/GameContext';

const mockNavigate = vi.fn();
const mockGameState = {
  navigate: mockNavigate,
  screen: 'loading' as const,
  runId: null,
  setRunId: vi.fn(),
  auth: null,
  discordReady: false,
  discordError: null as string | null,
  triggeredRelics: [],
  flashRelics: vi.fn(),
};

vi.mock('../context/GameContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../context/GameContext')>();
  return {
    ...actual,
    useGame: () => mockGameState,
  };
});

function renderLoading() {
  return render(<GameProvider><LoadingScreen /></GameProvider>);
}

describe('LoadingScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGameState.discordReady = false;
    mockGameState.discordError = null;
  });

  it('shows connecting message while loading', () => {
    renderLoading();
    expect(screen.getByText(/connecting to discord/i)).toBeInTheDocument();
  });

  it('renders animated domino tiles while loading', () => {
    renderLoading();
    expect(screen.getAllByTestId('loading-tile').length).toBeGreaterThan(0);
  });

  it('shows error message on SDK failure', () => {
    mockGameState.discordError = 'SDK init failed';
    renderLoading();
    expect(screen.getByText(/sdk init failed/i)).toBeInTheDocument();
  });

  it('shows retry button on error', () => {
    mockGameState.discordError = 'SDK init failed';
    renderLoading();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('retry button reloads the page', () => {
    mockGameState.discordError = 'oops';
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', { value: { reload: reloadSpy }, writable: true });
    renderLoading();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('shows game title', () => {
    renderLoading();
    expect(screen.getByText(/domino dungeon/i)).toBeInTheDocument();
  });
});
