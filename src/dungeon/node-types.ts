export enum NodeType {
  Combat = 'combat',
  Elite = 'elite',
  Boss = 'boss',
  Shop = 'shop',
  Event = 'event',
  Rest = 'rest',
}

export interface DungeonNode {
  id: string;
  type: NodeType;
  act: number;
  row: number;
  col: number;
  completed: boolean;
  connections: string[]; // IDs of next nodes
}

export interface CombatNode extends DungeonNode {
  type: NodeType.Combat | NodeType.Elite | NodeType.Boss;
  enemyTemplateId: string;
}

export interface ShopNode extends DungeonNode {
  type: NodeType.Shop;
  inventory: ShopItem[];
}

export interface ShopItem {
  id: string;
  type: 'stone' | 'relic' | 'potion' | 'removal';
  price: number;
  payload: unknown;
}

export interface EventNode extends DungeonNode {
  type: NodeType.Event;
  eventId: string;
}

export interface RestNode extends DungeonNode {
  type: NodeType.Rest;
}

export function createNode(id: string, type: NodeType, act: number, row: number, col: number): DungeonNode {
  return { id, type, act, row, col, completed: false, connections: [] };
}
