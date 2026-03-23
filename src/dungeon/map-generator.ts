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

  // Connect rows using column-proportional buckets so paths never cross.
  // Node at col c (in row of M) maps to next-row columns [lo, hi] where
  // lo = floor(c*N/M) and hi = min(N-1, floor((c+1)*N/M)).
  // Buckets are non-overlapping so connections stay order-preserving.
  for (let row = 0; row < ROWS - 1; row++) {
    const current = rowNodes[row];
    const next = rowNodes[row + 1];
    const M = current.length;
    const N = next.length;

    const connected = new Set<number>();

    for (let c = 0; c < M; c++) {
      const node = current[c];
      const lo = Math.floor(c * N / M);
      const hi = Math.min(N - 1, Math.floor((c + 1) * N / M));

      // Primary connection: random within bucket
      const primary = lo + Math.floor(rng() * (hi - lo + 1));
      node.connections.push(next[primary].id);
      connected.add(primary);

      // 40% chance of a second connection within the same bucket
      if (hi > lo && rng() < 0.4) {
        let alt = lo + Math.floor(rng() * (hi - lo + 1));
        if (alt === primary) alt = alt < hi ? alt + 1 : alt - 1;
        if (!node.connections.includes(next[alt].id)) {
          node.connections.push(next[alt].id);
          connected.add(alt);
        }
      }
    }

    // Ensure every next-row node has at least one incoming connection.
    // Map unconnected node i back to the current-row node whose bucket covers it.
    for (let i = 0; i < N; i++) {
      if (!connected.has(i)) {
        const c = Math.min(M - 1, Math.floor(i * M / N));
        if (!current[c].connections.includes(next[i].id)) {
          current[c].connections.push(next[i].id);
        }
      }
    }
  }

  return nodes;
}
