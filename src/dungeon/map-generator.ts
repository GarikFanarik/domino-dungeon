import seedrandom from 'seedrandom';
import { NodeType, DungeonNode } from './node-types';

// Node type distributions per act (excluding boss which is always last row)
const DISTRIBUTIONS: Record<number, Record<NodeType, number>> = {
  1: { [NodeType.Combat]: 45, [NodeType.Elite]: 15, [NodeType.Shop]: 10, [NodeType.Event]: 15, [NodeType.Rest]: 15, [NodeType.Boss]: 0 },
  2: { [NodeType.Combat]: 40, [NodeType.Elite]: 20, [NodeType.Shop]: 10, [NodeType.Event]: 15, [NodeType.Rest]: 15, [NodeType.Boss]: 0 },
  3: { [NodeType.Combat]: 35, [NodeType.Elite]: 25, [NodeType.Shop]: 10, [NodeType.Event]: 15, [NodeType.Rest]: 15, [NodeType.Boss]: 0 },
};

function pickNodeType(act: number, rng: () => number, forceFirst = false): NodeType {
  if (forceFirst) return NodeType.Combat;
  const dist = DISTRIBUTIONS[act] ?? DISTRIBUTIONS[1];
  const roll = rng() * 100;
  let cumulative = 0;
  for (const [type, weight] of Object.entries(dist)) {
    if (type === NodeType.Boss) continue;
    cumulative += weight;
    if (roll < cumulative) return type as NodeType;
  }
  return NodeType.Combat;
}

export function generateActMap(act: number, seed: string): DungeonNode[] {
  const rng = seedrandom(seed);
  const ROWS = 7;
  const nodes: DungeonNode[] = [];
  let nodeIndex = 0;

  // Generate nodes row by row
  const rowNodes: DungeonNode[][] = [];
  for (let row = 0; row < ROWS; row++) {
    const isFirstRow = row === 0;
    const isLastRow = row === ROWS - 1;

    const colCount = isLastRow ? 1 : Math.floor(rng() * 3) + 3; // 3-5 cols, last row = 1
    const rowArr: DungeonNode[] = [];

    for (let col = 0; col < colCount; col++) {
      const id = `node-${act}-${nodeIndex++}`;
      const type = isLastRow ? NodeType.Boss : pickNodeType(act, rng, isFirstRow);
      rowArr.push({ id, type, act, row, col, completed: false, connections: [] });
    }

    rowNodes.push(rowArr);
    nodes.push(...rowArr);
  }

  // Connect rows: each node connects to 1-2 nodes in the next row
  for (let row = 0; row < ROWS - 1; row++) {
    const current = rowNodes[row];
    const next = rowNodes[row + 1];

    // Ensure every next-row node has at least one incoming connection
    const connected = new Set<number>();

    for (const node of current) {
      const targetIdx = Math.floor(rng() * next.length);
      node.connections.push(next[targetIdx].id);
      connected.add(targetIdx);

      // 40% chance of second connection
      if (next.length > 1 && rng() < 0.4) {
        let alt = Math.floor(rng() * next.length);
        if (alt === targetIdx) alt = (alt + 1) % next.length;
        if (!node.connections.includes(next[alt].id)) {
          node.connections.push(next[alt].id);
          connected.add(alt);
        }
      }
    }

    // Ensure all next-row nodes have at least one incoming connection
    for (let i = 0; i < next.length; i++) {
      if (!connected.has(i)) {
        current[Math.floor(rng() * current.length)].connections.push(next[i].id);
      }
    }
  }

  return nodes;
}
