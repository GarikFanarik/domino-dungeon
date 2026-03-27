import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { DungeonMapScreen } from '../screens/DungeonMapScreen';
import { GameProvider } from '../context/GameContext';

global.fetch = vi.fn();

const mockMap = {
  nodes: [
    { id: 'n1', type: 'combat', row: 0, col: 1, connections: ['n2'], completed: false, available: true },
    { id: 'n2', type: 'shop',   row: 1, col: 1, connections: [],      completed: false, available: false },
    { id: 'n3', type: 'rest',   row: 1, col: 2, connections: [],      completed: false, available: false },
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
    const n1 = document.querySelector('[data-node-id="n1"]') as HTMLElement;
    expect(n1).not.toBeDisabled();
  });

  it('unavailable nodes are disabled', async () => {
    renderMap();
    await waitFor(() => screen.getAllByTestId('map-node'));
    const n2 = document.querySelector('[data-node-id="n2"]') as HTMLElement;
    const n3 = document.querySelector('[data-node-id="n3"]') as HTMLElement;
    expect(n2).toBeDisabled();
    expect(n3).toBeDisabled();
  });

  it('shows act number via background attribute', async () => {
    renderMap();
    await waitFor(() => {
      const bg = document.querySelector('.map-bg') as HTMLElement;
      expect(bg).toHaveAttribute('data-act', '1');
    });
  });

  it('renders node icons as images', async () => {
    renderMap();
    await waitFor(() => screen.getAllByTestId('map-node'));
    const imgs = screen.getAllByRole('img', { hidden: true });
    expect(imgs.length).toBeGreaterThan(0);
  });

  it('combat node icon uses combat image', async () => {
    renderMap();
    await waitFor(() => screen.getAllByTestId('map-node'));
    const img = screen.getByAltText('combat');
    expect(img).toHaveAttribute('src', '/assets/map/nodes/combat.png');
  });

  it('shop node icon uses shop image', async () => {
    renderMap();
    await waitFor(() => screen.getAllByTestId('map-node'));
    const img = screen.getByAltText('shop');
    expect(img).toHaveAttribute('src', '/assets/map/nodes/shop.png');
  });

  it('marks current node with current class', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ...mockMap, currentNodeId: 'n1' }),
    });
    renderMap();
    await waitFor(() => screen.getAllByTestId('map-node'));
    const n1 = document.querySelector('[data-node-id="n1"]') as HTMLElement;
    expect(n1).toHaveClass('map-node--current');
  });

  it('does not mark other nodes as current', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ...mockMap, currentNodeId: 'n1' }),
    });
    renderMap();
    await waitFor(() => screen.getAllByTestId('map-node'));
    const nodes = screen.getAllByTestId('map-node');
    expect(nodes[1]).not.toHaveClass('map-node--current');
  });

  it('uses act1 background for act 1', async () => {
    renderMap();
    await waitFor(() => screen.getAllByTestId('map-node'));
    const bg = document.querySelector('.map-bg') as HTMLElement;
    expect(bg).toHaveAttribute('data-act', '1');
  });

  it('uses act2 background for act 2', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ...mockMap, actNumber: 2 }),
    });
    renderMap();
    await waitFor(() => screen.getAllByTestId('map-node'));
    const bg = document.querySelector('.map-bg') as HTMLElement;
    expect(bg).toHaveAttribute('data-act', '2');
  });
});
