import { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import type { Screen } from '../context/GameContext';
import './DungeonMapScreen.css';

const NODE_ICONS: Record<string, string> = {
  combat: '⚔️', elite: '👹', boss: '💀', shop: '🏪', rest: '⛺', event: '❓',
};

const NODE_LABELS: Record<string, string> = {
  combat: 'Fight', elite: 'Elite', boss: 'Boss', shop: 'Shop', rest: 'Rest', event: 'Event',
};

const NODE_TO_SCREEN: Record<string, Screen> = {
  combat: 'combat', elite: 'combat', boss: 'combat',
  shop: 'shop', rest: 'rest', event: 'event',
};

interface MapNode {
  id: string;
  type: string;
  row: number;
  col: number;
  connections: string[];
  completed: boolean;
  available: boolean;
}

interface PlayerState {
  hp: { current: number; max: number };
  gold: number;
}

interface Props { runId: string; }

/** Maps node id → {x, y} pixel centre inside the .map-area div */
function useNodePositions(nodes: MapNode[], containerRef: React.RefObject<HTMLDivElement | null>) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    function measure() {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const map: Record<string, { x: number; y: number }> = {};
      nodes.forEach((node) => {
        const el = container.querySelector<HTMLElement>(`[data-node-id="${node.id}"]`);
        if (el) {
          const r = el.getBoundingClientRect();
          map[node.id] = {
            x: r.left - rect.left + r.width / 2,
            y: r.top - rect.top + r.height / 2,
          };
        }
      });
      setPositions(map);
    }

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [nodes, containerRef]);

  return positions;
}

export function DungeonMapScreen({ runId }: Props) {
  const { navigate } = useGame();
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [actNumber, setActNumber] = useState(1);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const positions = useNodePositions(nodes, containerRef);

  useEffect(() => {
    fetch(`/api/run/${runId}/map`)
      .then((r) => r.json())
      .then((data) => {
        setNodes(data.nodes || []);
        setActNumber(data.actNumber || 1);
      })
      .catch(() => {});

    fetch(`/api/run/${runId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.playerState) setPlayerState(data.playerState);
      })
      .catch(() => {});
  }, [runId]);

  async function handleNodeClick(node: MapNode) {
    if (!node.available) return;
    await fetch(`/api/run/${runId}/travel/${node.id}`, { method: 'POST' });
    navigate(NODE_TO_SCREEN[node.type] || 'combat');
  }

  const rows = Array.from(new Set(nodes.map((n) => n.row))).sort((a, b) => a - b);

  // Build connection lines
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number; key: string }> = [];
  nodes.forEach((node) => {
    node.connections.forEach((targetId) => {
      const from = positions[node.id];
      const to = positions[targetId];
      if (from && to) {
        lines.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, key: `${node.id}-${targetId}` });
      }
    });
  });

  function nodeStateClass(node: MapNode): string {
    if (node.completed) return 'map-node--completed';
    if (node.available) return 'map-node--available';
    return 'map-node--unavailable';
  }

  return (
    <div className="map-screen">
      <div className="map-bg" />
      <div className="map-content">
        {/* Top bar */}
        <div className="map-topbar">
          <h2 className="map-title">Act {actNumber} — The Dungeon</h2>
          {playerState && (
            <div className="map-player-stats">
              <span className="map-stat map-stat--hp">
                ❤️ <span className="map-stat-val">{playerState.hp.current}/{playerState.hp.max}</span>
              </span>
              <span className="map-stat map-stat--gold">
                💰 <span className="map-stat-val">{playerState.gold}g</span>
              </span>
            </div>
          )}
        </div>

        {/* Map area */}
        <div className="map-area" ref={containerRef}>
          {/* SVG connection lines — rendered behind nodes */}
          <svg className="map-svg" aria-hidden="true">
            {lines.map((ln) => (
              <line
                key={ln.key}
                x1={ln.x1} y1={ln.y1}
                x2={ln.x2} y2={ln.y2}
                stroke="rgba(120,90,40,0.45)"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
            ))}
          </svg>

          <div className="map-rows">
            {rows.map((row) => (
              <div key={row} className="map-row">
                {nodes
                  .filter((n) => n.row === row)
                  .sort((a, b) => a.col - b.col)
                  .map((node) => (
                    <button
                      key={node.id}
                      data-testid="map-node"
                      data-node-id={node.id}
                      className={`map-node ${nodeStateClass(node)} map-node-type--${node.type}`}
                      onClick={() => handleNodeClick(node)}
                      disabled={!node.available}
                      title={node.type}
                    >
                      {NODE_ICONS[node.type] ?? '?'}
                      <span className="map-node-label">{NODE_LABELS[node.type] ?? node.type}</span>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
