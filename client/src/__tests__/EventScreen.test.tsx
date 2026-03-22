import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { EventScreen } from '../screens/EventScreen';
import { GameProvider } from '../context/GameContext';

global.fetch = vi.fn();

const mockEvent = {
  id: 'event-1',
  description: 'A hooded figure offers you a glowing stone...',
  choices: [
    { label: 'Accept the stone', description: '+1 stone, -10 HP' },
    { label: 'Decline', description: 'Nothing happens' },
  ],
};

function renderEvent(runId = 'run-123') {
  return render(<GameProvider><EventScreen runId={runId} /></GameProvider>);
}

describe('EventScreen', () => {
  beforeEach(() => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, json: vi.fn().mockResolvedValue(mockEvent),
    });
  });

  it('shows event description', async () => {
    renderEvent();
    await waitFor(() => expect(screen.getByText(/hooded figure/i)).toBeInTheDocument());
  });

  it('shows all choices as buttons', async () => {
    renderEvent();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument();
    });
  });

  it('shows continue button after choosing', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(mockEvent) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ message: 'You received a stone!' }) });

    renderEvent();
    await waitFor(() => screen.getByRole('button', { name: /accept/i }));
    fireEvent.click(screen.getByRole('button', { name: /accept/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument());
  });
});
