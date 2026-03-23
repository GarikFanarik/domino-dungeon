import { render, screen, waitFor } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { RelicBar } from '../components/RelicBar';
import { GameContext } from '../context/GameContext';
import type { GameContextValue } from '../context/GameContext';

function mockContext(overrides: Partial<GameContextValue> = {}): GameContextValue {
  return {
    screen: 'combat',
    navigate: vi.fn(),
    runId: 'run-123',
    setRunId: vi.fn(),
    auth: null,
    discordReady: true,
    discordError: null,
    triggeredRelics: [],
    flashRelics: vi.fn(),
    ...overrides,
  };
}

function renderWithContext(ctx: GameContextValue) {
  return render(
    <GameContext.Provider value={ctx}>
      <RelicBar />
    </GameContext.Provider>
  );
}

beforeEach(() => {
  vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({
      playerState: {
        relics: ['worn-pouch', 'ember-core'],
        hp: { current: 80, max: 80 },
        gold: 0,
        armor: 0,
      },
    }),
  } as any);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RelicBar', () => {
  it('renders nothing when runId is null', () => {
    const { container } = renderWithContext(mockContext({ runId: null }));
    expect(container.firstChild).toBeNull();
  });

  it('fetches relics for the current run', async () => {
    renderWithContext(mockContext());
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/run/run-123'));
  });

  it('renders a relic icon for each relic', async () => {
    const { container } = renderWithContext(mockContext());
    await waitFor(() => {
      const icons = container.querySelectorAll('.relic-icon');
      expect(icons).toHaveLength(2);
    });
  });

  it('applies glow class to triggered relics', async () => {
    const { container } = renderWithContext(mockContext({ triggeredRelics: ['worn-pouch'] }));
    await waitFor(() => {
      const glowing = container.querySelectorAll('.relic-icon--glowing');
      expect(glowing).toHaveLength(1);
    });
  });

  it('does not apply glow class to non-triggered relics', async () => {
    const { container } = renderWithContext(mockContext({ triggeredRelics: ['ember-core'] }));
    await waitFor(() => {
      const icons = container.querySelectorAll('.relic-icon');
      expect(icons).toHaveLength(2);
      const glowing = container.querySelectorAll('.relic-icon--glowing');
      expect(glowing).toHaveLength(1);
    });
  });
});
