import type { Stone } from '../game/models/stone';
import type { Enemy } from '../game/models/enemy';
import type { PlayerState } from '../game/models/player-state';
import type { PlacedStone } from '../game/chain';
import type { RunStatus } from '../dungeon/run';
import type { NodeType } from '../dungeon/node-types';

export interface StartRunResponse {
  runId: string;
  playerState: PlayerState;
  map: MapNode[];
  currentNodeId: string;
}

export interface RunStateResponse {
  runId: string;
  playerState: PlayerState;
  currentNodeId: string;
  status: RunStatus;
  actNumber: number;
}

export interface CombatStateResponse {
  enemy: Enemy;
  playerHand: Stone[];
  chain: PlacedStone[];
  playerState: PlayerState;
  turnNumber: number;
  phase: 'player-turn' | 'enemy-turn' | 'resolving';
  swapsUsed?: number;
  swapsPerTurn?: number;
  leftOpen?: number | null;
  rightOpen?: number | null;
  bag?: Stone[];
}

export interface PlayStoneResponse {
  chain: PlacedStone[];
  hand: Stone[];
  leftOpen?: number | null;
  rightOpen?: number | null;
  message?: string;
}

export interface UnplayStoneResponse {
  chain: PlacedStone[];
  hand: Stone[];
  leftOpen?: number | null;
  rightOpen?: number | null;
}

export interface EndTurnResponse {
  playerState: PlayerState;
  enemy: Enemy;
  combatResult: 'ongoing' | 'player-won' | 'player-died';
  enemyAttack?: { damage: number; effects: string[] };
  hand?: Stone[];
  goldEarned?: number;
}

export interface MapNode {
  id: string;
  type: NodeType;
  row: number;
  col: number;
  connections: string[];
  completed: boolean;
  available: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  discordUserId: string;
  displayName: string;
  score: number;
  actsCleared: number;
  enemiesDefeated: number;
  runDate: string;
}

export interface RunSummaryResponse {
  status: RunStatus;
  actsCleared: number;
  enemiesDefeated: number;
  totalDamage: number;
  relicsCollected: number;
  goldEarned: number;
  causeOfDeath?: string;
  score: number;
}

export interface ApiError {
  error: string;
  code?: string;
}
