import type {
  StartRunResponse,
  CombatStateResponse,
  EndTurnResponse,
  LeaderboardEntry,
  MapNode,
  ApiError,
  RunStateResponse,
  PlayStoneResponse,
  RunSummaryResponse,
} from '../api';
import { RunStatus } from '../../dungeon/run';
import { NodeType } from '../../dungeon/node-types';

describe('API types', () => {
  it('StartRunResponse shape is valid', () => {
    const mock: StartRunResponse = {
      runId: 'run-1',
      playerState: {} as any,
      map: [],
      currentNodeId: 'node-1',
    };
    expect(mock.runId).toBe('run-1');
  });

  it('RunStateResponse shape is valid', () => {
    const mock: RunStateResponse = {
      runId: 'run-2',
      playerState: {} as any,
      currentNodeId: 'node-2',
      status: RunStatus.Active,
      actNumber: 1,
    };
    expect(mock.status).toBe(RunStatus.Active);
  });

  it('CombatStateResponse shape is valid', () => {
    const mock: CombatStateResponse = {
      enemy: {} as any,
      playerHand: [],
      board: {} as any,
      enemyHandCount: 0,
      playerState: {} as any,
      turnNumber: 1,
      phase: 'player-turn',
      act: 1,
    };
    expect(mock.turnNumber).toBe(1);
    expect(mock.phase).toBe('player-turn');
  });

  it('CombatStateResponse phase union covers all values', () => {
    const phases: CombatStateResponse['phase'][] = [
      'player-turn',
      'enemy-turn',
      'resolving',
    ];
    expect(phases).toHaveLength(3);
  });

  it('PlayStoneResponse shape is valid', () => {
    const mock: PlayStoneResponse = {
      board: {} as any,
      hand: [],
      previewDamage: 0,
    };
    expect(mock.board).toBeDefined();
  });

  it('PlayStoneResponse hand is an array', () => {
    const mock: PlayStoneResponse = {
      board: {} as any,
      hand: [],
      previewDamage: 0,
    };
    expect(Array.isArray(mock.hand)).toBe(true);
  });

  it('EndTurnResponse shape is valid', () => {
    const mock: EndTurnResponse = {
      playerState: {} as any,
      enemy: {} as any,
      combatResult: 'ongoing',
      dotDamage: { burn: 0, poison: 0 },
    };
    expect(mock.combatResult).toBe('ongoing');
  });

  it('EndTurnResponse optional enemyAttack works', () => {
    const mock: EndTurnResponse = {
      playerState: {} as any,
      enemy: {} as any,
      combatResult: 'player-won',
      dotDamage: { burn: 0, poison: 0 },
      enemyAttack: {
        stonesPlayed: [{ leftPip: 2, rightPip: 3 }],
        rawDamage: 5,
        armorBlocked: 0,
        damage: 5,
        effects: [],
      },
    };
    expect(mock.enemyAttack?.damage).toBe(5);
  });

  it('MapNode shape is valid', () => {
    const mock: MapNode = {
      id: 'node-1',
      type: NodeType.Combat,
      row: 0,
      col: 1,
      connections: ['node-2'],
      completed: false,
      available: true,
    };
    expect(mock.type).toBe(NodeType.Combat);
  });

  it('LeaderboardEntry shape is valid', () => {
    const mock: LeaderboardEntry = {
      rank: 1,
      discordUserId: 'user-123',
      displayName: 'Player One',
      score: 9999,
      actsCleared: 3,
      enemiesDefeated: 15,
      runDate: '2026-03-21T00:00:00Z',
    };
    expect(mock.rank).toBe(1);
  });

  it('RunSummaryResponse shape is valid', () => {
    const mock: RunSummaryResponse = {
      status: RunStatus.Won,
      actsCleared: 3,
      enemiesDefeated: 12,
      totalDamage: 450,
      relicsCollected: 4,
      goldEarned: 200,
      score: 1500,
    };
    expect(mock.status).toBe(RunStatus.Won);
  });

  it('RunSummaryResponse optional causeOfDeath works', () => {
    const mock: RunSummaryResponse = {
      status: RunStatus.Lost,
      actsCleared: 1,
      enemiesDefeated: 3,
      totalDamage: 100,
      relicsCollected: 1,
      goldEarned: 50,
      causeOfDeath: 'Goblin',
      score: 300,
    };
    expect(mock.causeOfDeath).toBe('Goblin');
  });

  it('ApiError shape is valid', () => {
    const mock: ApiError = {
      error: 'Not found',
    };
    expect(mock.error).toBe('Not found');
  });

  it('ApiError optional code works', () => {
    const mock: ApiError = {
      error: 'Unauthorized',
      code: 'AUTH_REQUIRED',
    };
    expect(mock.code).toBe('AUTH_REQUIRED');
  });
});
