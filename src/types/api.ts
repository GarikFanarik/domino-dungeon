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
  elementCounts?: { fire: number; ice: number; lightning: number; poison: number; earth: number; neutral: number };
  totalStones?: number;
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
  enemyAttack?: {
    stone: { leftPip: number; rightPip: number };
    rawDamage: number;
    armorBlocked: number;
    damage: number;       // net HP lost = rawDamage - armorBlocked
    effects: string[];    // kept for backwards compat; always []
  };
  enemySkipped?: { reason: 'stunned' | 'frozen' };
  dotDamage: { burn: number; poison: number };   // required; defaults { burn:0, poison:0 }
  hand?: Stone[];
  goldEarned?: number;
  stoneRewards?: Array<{ element: string; leftPip: number; rightPip: number }>;
  triggeredRelics?: string[];
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
