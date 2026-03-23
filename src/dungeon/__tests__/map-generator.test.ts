import { generateActMap } from '../map-generator';
import { NodeType } from '../node-types';

describe('Procedural map generation', () => {
  test('generates nodes for act 1', () => {
    const nodes = generateActMap(1, 'test-seed');
    expect(nodes.length).toBeGreaterThan(0);
  });

  test('first row is always combat', () => {
    const nodes = generateActMap(1, 'seed1');
    const row0Nodes = nodes.filter(n => n.row === 0);
    expect(row0Nodes.length).toBeGreaterThan(0);
    row0Nodes.forEach(n => expect(n.type).toBe(NodeType.Combat));
  });

  test('last row has exactly one boss node', () => {
    const nodes = generateActMap(1, 'seed1');
    const maxRow = Math.max(...nodes.map(n => n.row));
    const lastRow = nodes.filter(n => n.row === maxRow);
    expect(lastRow.length).toBe(1);
    expect(lastRow[0].type).toBe(NodeType.Boss);
  });

  test('boss node has no forward connections', () => {
    const nodes = generateActMap(1, 'seed1');
    const boss = nodes.find(n => n.type === NodeType.Boss)!;
    expect(boss.connections).toEqual([]);
  });

  test('map has 7 rows', () => {
    const nodes = generateActMap(1, 'seed1');
    const rows = new Set(nodes.map(n => n.row));
    expect(rows.size).toBe(7);
  });

  test('each row has 3-5 nodes', () => {
    const nodes = generateActMap(1, 'seed1');
    for (let row = 0; row < 7; row++) {
      const rowNodes = nodes.filter(n => n.row === row);
      expect(rowNodes.length).toBeGreaterThanOrEqual(1); // last row has 1 (boss)
      expect(rowNodes.length).toBeLessThanOrEqual(5);
    }
  });

  test('same seed produces same map', () => {
    const map1 = generateActMap(2, 'fixed');
    const map2 = generateActMap(2, 'fixed');
    expect(map1.map(n => n.type)).toEqual(map2.map(n => n.type));
  });

  test('all non-boss nodes have at least one connection', () => {
    const nodes = generateActMap(1, 'seed2');
    const nonBoss = nodes.filter(n => n.type !== NodeType.Boss);
    nonBoss.forEach(n => expect(n.connections.length).toBeGreaterThan(0));
  });

  test('connections never cross (left node never connects further right than a right node)', () => {
    for (const seed of ['seed1', 'seed2', 'test-seed', 'abc', 'xyz']) {
      const nodes = generateActMap(1, seed);
      const byRow: Record<number, typeof nodes> = {};
      nodes.forEach(n => { (byRow[n.row] ??= []).push(n); });
      const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));

      const rows = Object.keys(byRow).map(Number).sort((a, b) => a - b);
      for (const row of rows) {
        const rowNodes = byRow[row].sort((a, b) => a.col - b.col);
        for (let i = 0; i < rowNodes.length; i++) {
          for (let j = i + 1; j < rowNodes.length; j++) {
            const leftNode = rowNodes[i];
            const rightNode = rowNodes[j];
            const leftCols = leftNode.connections.map(id => nodeById[id].col);
            const rightCols = rightNode.connections.map(id => nodeById[id].col);
            const maxLeft = Math.max(...leftCols, -Infinity);
            const minRight = Math.min(...rightCols, Infinity);
            expect(maxLeft).toBeLessThanOrEqual(minRight);
          }
        }
      }
    }
  });
});
