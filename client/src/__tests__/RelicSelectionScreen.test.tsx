import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { RelicSelectionScreen } from '../screens/RelicSelectionScreen';
import { GameProvider } from '../context/GameContext';

global.fetch = vi.fn();

const mockOffer = [
  { relicId: 'phoenix-feather', name: 'Phoenix Feather', rarity: 'EPIC',   description: 'Survive a lethal hit' },
  { relicId: 'worn-pouch',      name: 'Worn Pouch',      rarity: 'COMMON', description: 'Draw 1 extra stone' },
  { relicId: 'storm-amulet',    name: 'Storm Amulet',    rarity: 'RARE',   description: 'Lightning +5 damage' },
];

function renderRelics(runId = 'run-123') {
  return render(<GameProvider><RelicSelectionScreen runId={runId} /></GameProvider>);
}

describe('RelicSelectionScreen', () => {
  beforeEach(() => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, json: vi.fn().mockResolvedValue(mockOffer),
    });
  });

  it('shows all 3 relic options', async () => {
    renderRelics();
    await waitFor(() => {
      expect(screen.getByText('Phoenix Feather')).toBeInTheDocument();
      expect(screen.getByText('Worn Pouch')).toBeInTheDocument();
      expect(screen.getByText('Storm Amulet')).toBeInTheDocument();
    });
  });

  it('shows rarity for each relic', async () => {
    renderRelics();
    await waitFor(() => expect(screen.getByText('EPIC')).toBeInTheDocument());
  });

  it('shows Select button for each relic', async () => {
    renderRelics();
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /select/i })).toHaveLength(3);
    });
  });

  it('shows a relic image for each offer card', async () => {
    renderRelics();
    await waitFor(() => {
      const imgs = screen.getAllByRole('img');
      expect(imgs).toHaveLength(3);
    });
  });
});
