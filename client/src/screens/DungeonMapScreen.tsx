import { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import type { Screen } from '../context/GameContext';
import './DungeonMapScreen.css';

const ELEMENT_ICONS: Record<string, string> = {
  fire:      '/assets/elements/fire/flamer.png',
  ice:       '/assets/elements/ice/snowflake-2.png',
  lightning: '/assets/elements/lightning/focused-lightning.png',
  poison:    '/assets/elements/poison/skull-with-syringe.png',
  earth:     '/assets/elements/earth/rock.png',
};

const NODE_ICONS: Record<string, string> = {
  combat: '/assets/map/nodes/combat.png',
  elite:  '/assets/map/nodes/elite.png',
  boss:   '/assets/map/nodes/boss.png',
  shop:   '/assets/map/nodes/shop.png',
  rest:   '/assets/map/nodes/rest.png',
  event:  '/assets/map/nodes/event.png',
};

const NODE_LABELS: Record<string, string> = {
  combat: 'Fight', elite: 'Elite', boss: 'Boss', shop: 'Shop', rest: 'Rest', event: 'Event',
};

const NODE_TO_SCREEN: Record<string, Screen> = {
  combat: 'combat', elite: 'combat', boss: 'combat',
  shop: 'shop', rest: 'rest', event: 'event',
};

const ACT_BACKGROUNDS: Record<number, string> = {
  1: '/assets/map/background/act1.jpg',
  2: '/assets/map/background/act2.jpg',
  3: '/assets/map/background/act3.jpg',
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

interface ElementCounts {
  fire: number;
  ice: number;
  lightning: number;
  poison: number;
  earth: number;
  neutral: number;
}

interface Props { runId: string; }

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
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [elementCounts, setElementCounts] = useState<ElementCounts | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const positions = useNodePositions(nodes, containerRef);

  useEffect(() => {
    fetch(`/api/run/${runId}/map`)
      .then((r) => r.json())
      .then((data) => {
        setNodes(data.nodes || []);
        setActNumber(data.actNumber || 1);
        setCurrentNodeId(data.currentNodeId ?? null);
      })
      .catch(() => {});

    fetch(`/api/run/${runId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.playerState) setPlayerState(data.playerState);
        if (data.elementCounts) setElementCounts(data.elementCounts);
      })
      .catch(() => {});
  }, [runId]);

  async function handleNodeClick(node: MapNode) {
    if (!node.available) return;
    await fetch(`/api/run/${runId}/travel/${node.id}`, { method: 'POST' });
    navigate(NODE_TO_SCREEN[node.type] || 'combat');
  }

  const rows = Array.from(new Set(nodes.map((n) => n.row))).sort((a, b) => a - b);

  if (!runId) {
    return (
      <div className="map-screen">
        <div className="map-bg" />
        <div className="map-content" style={{ alignItems: 'center', justifyContent: 'center', color: '#e8d8b0' }}>
          <p>Error: no run ID. Please return to the menu and start a new run.</p>
        </div>
      </div>
    );
  }

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

  function nodeClasses(node: MapNode): string {
    const state = node.completed
      ? 'map-node--completed'
      : node.available
        ? 'map-node--available'
        : 'map-node--unavailable';
    const current = node.id === currentNodeId ? ' map-node--current' : '';
    return `map-node ${state} map-node-type--${node.type}${current}`;
  }

  const bgUrl = ACT_BACKGROUNDS[actNumber] ?? ACT_BACKGROUNDS[1];

  return (
    <div className="map-screen">
      <div
        className="map-bg"
        data-act={actNumber}
        style={{ backgroundImage: `url('${bgUrl}')` }}
      />
      <div className="map-content">
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
              {elementCounts && (
                <>
                  {(Object.keys(ELEMENT_ICONS) as Array<keyof typeof elementCounts>).map((el) =>
                    elementCounts[el] > 0 ? (
                      <span key={el} className="map-stat map-stat--element">
                        <img src={ELEMENT_ICONS[el as string]} alt={el as string} className="map-stat-element-icon" />
                        <span className="map-stat-val">{elementCounts[el]}</span>
                      </span>
                    ) : null
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="map-area" ref={containerRef}>
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
                      className={nodeClasses(node)}
                      onClick={() => handleNodeClick(node)}
                      disabled={!node.available}
                      title={NODE_LABELS[node.type] ?? node.type}
                    >
                      {NODE_ICONS[node.type] && (
                        <img
                          src={NODE_ICONS[node.type]}
                          alt={node.type}
                          className="map-node-icon"
                        />
                      )}
                      <span className="map-node-label">{NODE_LABELS[node.type] ?? node.type}</span>
                      {node.id === currentNodeId && (
                        <span className="map-node-current-marker" aria-label="current position" />
                      )}
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
