import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { RestScreen } from '../screens/RestScreen';
import { GameProvider } from '../context/GameContext';

global.fetch = vi.fn();

function renderRest(runId = 'run-123') {
  return render(<GameProvider><RestScreen runId={runId} /></GameProvider>);
}

describe('RestScreen', () => {
  it('shows Rest & Heal option', () => {
    renderRest();
    expect(screen.getByRole('button', { name: /heal/i })).toBeInTheDocument();
  });

  it('shows Upgrade Stone option', () => {
    renderRest();
    expect(screen.getByRole('button', { name: /upgrade/i })).toBeInTheDocument();
  });

  it('clicking Heal calls rest/heal endpoint', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, json: vi.fn().mockResolvedValue({ newHp: 80, healed: 24 }),
    });
    renderRest();
    fireEvent.click(screen.getByRole('button', { name: /heal/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/heal'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
