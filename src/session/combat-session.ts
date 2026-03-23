import redis from '../lib/redis';

export interface Stone {
  id: string;
  leftPip: number;
  rightPip: number;
  element: string | null;
}

export interface PlacedStone {
  stone: Stone;
  side: 'left' | 'right';
  flipped: boolean;
}

export interface CombatSession {
  userId: string;
  runId: string;
  enemyId: string;
  enemyHp: number;
  enemyMaxHp: number;
  enemyStatus: {
    burn: number;
    slow: number;
    frozen: boolean;
    stunned: boolean;
    poison: number;
  };
  hand: Stone[];
  bag: Stone[];
  chain: {
    stones: PlacedStone[];
    leftOpen: number | null;
    rightOpen: number | null;
  };
  turnNumber: number;
  swapsUsed: number;
  swapsPerTurn: number;
  playerHp?: number;
  playerMaxHp?: number;
  playerArmor?: number;
  playerGold?: number;
  relics?: string[];
  phoenixUsed?: boolean;
  handSize?: number;
  stonesPlayedTotal?: number;
  pendingStoneRewards?: Array<{ element: string; leftPip: number; rightPip: number }>;
}

const SESSION_TTL = 86400; // 24 hours in seconds

function sessionKey(userId: string): string {
  return `combat:${userId}`;
}

export async function createCombatSession(session: CombatSession): Promise<void> {
  const key = sessionKey(session.userId);
  await redis.set(key, JSON.stringify(session), 'EX', SESSION_TTL);
}

export async function getCombatSession(userId: string): Promise<CombatSession | null> {
  const key = sessionKey(userId);
  const raw = await redis.get(key);
  if (raw === null) return null;
  return JSON.parse(raw) as CombatSession;
}

export async function saveCombatSession(session: CombatSession): Promise<void> {
  const key = sessionKey(session.userId);
  await redis.set(key, JSON.stringify(session), 'EX', SESSION_TTL);
}

export async function deleteCombatSession(userId: string): Promise<void> {
  const key = sessionKey(userId);
  await redis.del(key);
}
