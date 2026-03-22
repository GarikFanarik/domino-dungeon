import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ShopScreen } from '../screens/ShopScreen';
import { GameProvider } from '../context/GameContext';

global.fetch = vi.fn();

const mockShop = {
  items: [
    { id: 'item-1', type: 'stone', name: 'Fire Stone', description: 'Adds fire', cost: 30, sold: false },
    { id: 'item-2', type: 'relic', name: 'Iron Shield', description: '+5 armor', cost: 80, sold: false },
    { id: 'item-3', type: 'potion', name: 'Health Potion', description: '+20 HP', cost: 25, sold: false },
  ],
  playerGold: 45,
};

function renderShop(runId = 'run-123') {
  return render(<GameProvider><ShopScreen runId={runId} /></GameProvider>);
}

describe('ShopScreen', () => {
  beforeEach(() => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, json: vi.fn().mockResolvedValue(mockShop),
    });
  });

  it('shows shop items after loading', async () => {
    renderShop();
    await waitFor(() => {
      expect(screen.getByText('Fire Stone')).toBeInTheDocument();
      expect(screen.getByText('Iron Shield')).toBeInTheDocument();
    });
  });

  it('shows player gold', async () => {
    renderShop();
    await waitFor(() => expect(screen.getByText(/45g/)).toBeInTheDocument());
  });

  it('buy button disabled when item costs more than gold', async () => {
    renderShop();
    await waitFor(() => screen.getByText('Iron Shield'));
    const buyButtons = screen.getAllByRole('button', { name: /buy/i });
    expect(buyButtons[1]).toBeDisabled(); // Iron Shield 80g > 45g
  });

  it('buy button enabled when player has enough gold', async () => {
    renderShop();
    await waitFor(() => screen.getByText('Fire Stone'));
    const buyButtons = screen.getAllByRole('button', { name: /buy/i });
    expect(buyButtons[0]).not.toBeDisabled(); // Fire Stone 30g <= 45g
  });

  it('shows Leave Shop button', async () => {
    renderShop();
    await waitFor(() => expect(screen.getByRole('button', { name: /leave/i })).toBeInTheDocument());
  });
});
