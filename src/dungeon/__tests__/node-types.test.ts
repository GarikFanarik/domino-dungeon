import { NodeType, DungeonNode, CombatNode, ShopNode, EventNode, RestNode, createNode } from '../node-types';

describe('Node types', () => {
  test('NodeType enum has all 6 types', () => {
    expect(NodeType.Combat).toBeDefined();
    expect(NodeType.Elite).toBeDefined();
    expect(NodeType.Boss).toBeDefined();
    expect(NodeType.Shop).toBeDefined();
    expect(NodeType.Event).toBeDefined();
    expect(NodeType.Rest).toBeDefined();
  });

  test('createNode returns node with correct type', () => {
    const node = createNode('n1', NodeType.Combat, 1, 0, 0);
    expect(node.type).toBe(NodeType.Combat);
    expect(node.id).toBe('n1');
    expect(node.completed).toBe(false);
    expect(node.connections).toEqual([]);
  });

  test('CombatNode has enemyTemplateId', () => {
    const node: CombatNode = {
      id: 'c1', type: NodeType.Combat, act: 1, row: 0, col: 0,
      completed: false, connections: [], enemyTemplateId: 'goblin',
    };
    expect(node.enemyTemplateId).toBe('goblin');
  });

  test('ShopNode has inventory array', () => {
    const node: ShopNode = {
      id: 's1', type: NodeType.Shop, act: 1, row: 2, col: 1,
      completed: false, connections: [], inventory: [],
    };
    expect(Array.isArray(node.inventory)).toBe(true);
  });

  test('EventNode has eventId', () => {
    const node: EventNode = {
      id: 'e1', type: NodeType.Event, act: 1, row: 3, col: 0,
      completed: false, connections: [], eventId: 'mysterious-merchant',
    };
    expect(node.eventId).toBe('mysterious-merchant');
  });

  test('RestNode needs no extra fields', () => {
    const node: RestNode = {
      id: 'r1', type: NodeType.Rest, act: 1, row: 4, col: 1,
      completed: false, connections: [],
    };
    expect(node.type).toBe(NodeType.Rest);
  });
});
