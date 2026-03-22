import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { DungeonMapScreen } from '../screens/DungeonMapScreen';
import { GameProvider } from '../context/GameContext';

global.fetch = vi.fn();

const mockMap = {
  nodes: [
    { id: 'n1', type: 'combat', row: 0, col: 1, connections: ['n2'], completed: false, available: true },
    { id: 'n2', type: 'shop', row: 1, col: 1, connections: [], completed: false, available: false },
    { id: 'n3', type: 'rest', row: 1, col: 2, connections: [], completed: false, available: false },
  ],
  currentNodeId: null,
  actNumber: 1,
};

function renderMap(runId = 'run-123') {
  return render(<GameProvider><DungeonMapScreen runId={runId} /></GameProvider>);
}

describe('DungeonMapScreen', () => {
  beforeEach(() => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, json: vi.fn().mockResolvedValue(mockMap),
    });
  });

  it('renders correct number of nodes', async () => {
    renderMap();
    await waitFor(() => expect(screen.getAllByTestId('map-node')).toHaveLength(3));
  });

  it('available nodes are not disabled', async () => {
    renderMap();
    await waitFor(() => screen.getAllByTestId('map-node'));
    expect(screen.getAllByTestId('map-node')[0]).not.toBeDisabled();
  });

  it('unavailable nodes are disabled', async () => {
    renderMap();
    await waitFor(() => screen.getAllByTestId('map-node'));
    const nodes = screen.getAllByTestId('map-node');
    expect(nodes[1]).toBeDisabled();
    expect(nodes[2]).toBeDisabled();
  });

  it('shows act number', async () => {
    renderMap();
    await waitFor(() => expect(screen.getByText(/act 1/i)).toBeInTheDocument());
  });
});
