import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { RelicSelectionScreen } from '../screens/RelicSelectionScreen';
import { GameProvider } from '../context/GameContext';

global.fetch = vi.fn();

const mockOffer = [
  { relicId: 'PHOENIX_FEATHER', name: 'Phoenix Feather', rarity: 'EPIC', description: 'Revive once with 1 HP' },
  { relicId: 'IRON_WILL', name: 'Iron Will', rarity: 'COMMON', description: '+5 max HP' },
  { relicId: 'STORM_LENS', name: 'Storm Lens', rarity: 'RARE', description: 'Lightning +2 bonus' },
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
      expect(screen.getByText('Iron Will')).toBeInTheDocument();
      expect(screen.getByText('Storm Lens')).toBeInTheDocument();
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
});
