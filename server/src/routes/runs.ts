import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import redis from '../../../src/lib/redis';
import { startRun, failRun, RunStatus } from '../../../src/dungeon/run';
import { generateActMap } from '../../../src/dungeon/map-generator';
import { defaultPlayerState } from '../../../src/game/models/player-state';
import { Bag } from '../../../src/game/bag';
import { createCombatSession, CombatSession } from '../../../src/session/combat-session';
import type { StartRunResponse, RunStateResponse, MapNode } from '../../../src/types/api';
import { NodeType, type DungeonNode } from '../../../src/dungeon/node-types';
import { RelicType, applyCrackedShield, applyWornPouch, applyLuckyPip } from '../../../src/game/relics/common';
import { applyBloodPactStart } from '../../../src/game/relics/legendary';
import { applyPoisonTome } from '../../../src/game/relics/epic';
import type { Stone } from '../../../src/game/models/stone';

const router = Router();

const RUN_TTL = 86400; // 24 hours in seconds

function runKey(runId: string): string {
  return `run:${runId}`;
}

function activeRunKey(userId: string): string {
  return `active_run:${userId}`;
}

function toMapNode(node: DungeonNode, _currentNodeId: string | null, allNodes: DungeonNode[]): MapNode {
  const available =
    !node.completed &&
    (node.row === 0 ||
      allNodes.some((n) => n.completed && n.connections.includes(node.id)));
  return {
    id: node.id,
    type: node.type,
    row: node.row,
    col: node.col,
    connections: node.connections,
    completed: node.completed,
    available,
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickEnemyName(type: NodeType, nodeId: string, act: number): string {
  if (type === NodeType.Boss) return `Act ${act} Boss`;
  if (type === NodeType.Elite) {
    const elites = ['Crypt Sentinel', 'Stonewarden'];
    return elites[hashStr(nodeId) % elites.length];
  }
  const normals = ['Tomb Rat', 'Crypt Sentinel', 'Stonewarden'];
  return normals[hashStr(nodeId) % normals.length];
}

function pickEnemyHp(type: NodeType, act: number): number {
  if (type === NodeType.Boss) return 120 + act * 20;
  if (type === NodeType.Elite) return 55 + act * 10;
  return 25 + act * 8;
}

// POST /start
router.post('/start', async (req: Request, res: Response) => {
  const { discordUserId } = req.body as { discordUserId?: string };

  if (!discordUserId || discordUserId.trim() === '') {
    res.status(400).json({ error: 'discordUserId is required' });
    return;
  }

  const seed = randomUUID();
  const run = startRun(discordUserId, seed);
  const map = generateActMap(run.currentAct, seed);
  const playerState = defaultPlayerState();

  const firstNode = map.find((n) => n.row === 0) ?? map[0];
  const currentNodeId = firstNode?.id ?? null;

  const defaultBag = new Bag();
  defaultBag.shuffle();
  const initialStones = [...defaultBag.stones];

  const runState = {
    run,
    playerState,
    map,
    currentNodeId,
    stones: initialStones,
  };

  await redis.set(runKey(run.id), JSON.stringify(runState), 'EX', RUN_TTL);
  await redis.set(activeRunKey(discordUserId), run.id, 'EX', RUN_TTL);

  const response: StartRunResponse = {
    runId: run.id,
    playerState,
    map: map.map((n) => toMapNode(n, currentNodeId, map)),
    currentNodeId: currentNodeId ?? '',
  };

  res.status(201).json(response);
});

// GET /active — MUST be before /:runId
router.get('/active', async (req: Request, res: Response) => {
  const userId = req.headers['x-discord-user-id'] as string | undefined;

  if (!userId) {
    res.status(400).json({ error: 'x-discord-user-id header is required' });
    return;
  }

  let runId: string | null = null;
  try {
    runId = await redis.get(activeRunKey(userId));
  } catch {
    // Redis unavailable — treat as no active run
    runId = null;
  }

  res.json({ runId });
});

// GET /:runId
router.get('/:runId', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;

  let raw: string | null = null;
  try {
    raw = await redis.get(runKey(runId));
  } catch {
    raw = null;
  }

  if (raw === null) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  const state = JSON.parse(raw) as {
    run: ReturnType<typeof startRun>;
    playerState: ReturnType<typeof defaultPlayerState>;
    map: DungeonNode[];
    currentNodeId: string | null;
    stones?: Stone[];
  };

  const elementCounts = { fire: 0, ice: 0, lightning: 0, poison: 0, earth: 0, neutral: 0 };
  if (state.stones) {
    for (const s of state.stones) {
      const el = s.element as string | null;
      if (el && el in elementCounts) (elementCounts as any)[el]++;
      else elementCounts.neutral++;
    }
  }
  const totalStones = state.stones ? state.stones.length : 0;

  // Sync relics from run into playerState so the client sees the correct list
  state.playerState.relics = state.run.relics ?? [];

  const response: RunStateResponse = {
    runId: state.run.id,
    playerState: state.playerState,
    currentNodeId: state.currentNodeId ?? '',
    status: state.run.status,
    actNumber: state.run.currentAct,
    elementCounts,
    totalStones,
  };

  res.json(response);
});

// POST /:runId/abandon
router.post('/:runId/abandon', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;

  let raw: string | null = null;
  try {
    raw = await redis.get(runKey(runId));
  } catch {
    raw = null;
  }

  if (raw === null) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  const state = JSON.parse(raw) as {
    run: ReturnType<typeof startRun>;
    playerState: ReturnType<typeof defaultPlayerState>;
    map: DungeonNode[];
    currentNodeId: string | null;
  };

  failRun(state.run);

  await redis.set(runKey(runId), JSON.stringify(state), 'EX', RUN_TTL);
  await redis.del(activeRunKey(state.run.userId));

  res.json({ success: true });
});

// GET /:runId/map
router.get('/:runId/map', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;

  let raw: string | null = null;
  try {
    raw = await redis.get(runKey(runId));
  } catch {
    raw = null;
  }

  if (raw === null) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  const state = JSON.parse(raw) as {
    run: ReturnType<typeof startRun>;
    playerState: ReturnType<typeof defaultPlayerState>;
    map: DungeonNode[];
    currentNodeId: string | null;
  };

  res.json({
    nodes: state.map.map((n) => toMapNode(n, state.currentNodeId, state.map)),
    currentNodeId: state.currentNodeId,
    actNumber: state.run.currentAct,
  });
});

// GET /:runId/summary
router.get('/:runId/summary', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;
  let raw: string | null = null;
  try { raw = await redis.get(runKey(runId)); } catch { raw = null; }
  if (raw === null) { res.status(404).json({ error: 'Run not found' }); return; }
  const state = JSON.parse(raw) as { run: ReturnType<typeof startRun>; map: DungeonNode[]; currentNodeId: string | null; playerState: any; };
  const completedNodes = state.map.filter(n => n.completed);
  const enemiesDefeated = completedNodes.filter(n => ['combat','elite','boss'].includes(n.type)).length;
  const response = {
    status: state.run.status,
    actsCleared: state.run.currentAct - 1,
    enemiesDefeated,
    totalDamage: 0,
    relicsCollected: state.run.relics?.length ?? 0,
    goldEarned: state.run.gold ?? 0,
    causeOfDeath: state.run.status === RunStatus.Lost ? 'Defeated in combat' : undefined,
    score: enemiesDefeated * 100 + (state.run.gold ?? 0),
  };
  res.json(response);
});

// POST /:runId/travel/:nodeId — enter a node (creates combat session for combat nodes)
router.post('/:runId/travel/:nodeId', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;
  const nodeId = req.params['nodeId'] as string;

  let raw: string | null = null;
  try {
    raw = await redis.get(runKey(runId));
  } catch {
    raw = null;
  }

  if (raw === null) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  const state = JSON.parse(raw) as {
    run: ReturnType<typeof startRun>;
    playerState: ReturnType<typeof defaultPlayerState>;
    map: DungeonNode[];
    currentNodeId: string | null;
    stones?: Stone[];
  };

  const node = state.map.find((n) => n.id === nodeId);
  if (!node) {
    res.status(404).json({ error: 'Node not found' });
    return;
  }

  // Update current node
  state.currentNodeId = nodeId;
  await redis.set(runKey(runId), JSON.stringify(state), 'EX', RUN_TTL);

  // Create combat session for combat/elite/boss nodes
  const combatTypes: NodeType[] = [NodeType.Combat, NodeType.Elite, NodeType.Boss];
  if (combatTypes.includes(node.type)) {
    const enemyName = pickEnemyName(node.type, nodeId, state.run.currentAct);
    const enemyHp = pickEnemyHp(node.type, state.run.currentAct);

    const persistedStones = state.stones ? [...state.stones] : (() => { const b = new Bag(); b.shuffle(); return [...b.stones]; })();
    const bag = new Bag(persistedStones);
    bag.shuffle();

    const relics: string[] = state.run.relics ?? [];

    // WornPouch: draw 8 stones instead of 7
    const handSize = relics.includes(RelicType.WornPouch) ? applyWornPouch(7) : 7;
    const hand = bag.draw(handSize);

    const enemyStatus = { burn: 0, slow: 0, frozen: false, stunned: false, poison: 0 };
    let playerArmor = state.playerState.armor;
    let playerHp = state.playerState.hp.current;

    // LuckyPip: +1 swap per turn permanently
    let swapsPerTurn = relics.includes(RelicType.LuckyPip) ? applyLuckyPip(1) : 1;

    // Apply on-combat-start relic effects
    if (relics.includes(RelicType.CrackedShield)) {
      const armorBonus = relics.includes(RelicType.IronSkin) ? 1 : 0;
      applyCrackedShield(state.playerState, 20);
      state.playerState.armor += armorBonus;
      playerArmor = state.playerState.armor;
    }
    if (relics.includes(RelicType.BloodPact)) {
      const hpObj = { current: playerHp, max: state.playerState.hp.max };
      applyBloodPactStart(hpObj);
      playerHp = hpObj.current;
    }
    if (relics.includes(RelicType.PoisonTome)) {
      applyPoisonTome({ status: enemyStatus } as any);
    }

    const session: CombatSession = {
      userId: runId,
      runId,
      enemyId: enemyName,
      enemyHp,
      enemyMaxHp: enemyHp,
      enemyStatus,
      hand,
      bag: bag.stones,
      chain: { stones: [], leftOpen: null, rightOpen: null },
      turnNumber: 1,
      swapsUsed: 0,
      swapsPerTurn,
      handSize,
      stonesPlayedTotal: 0,
      playerHp,
      playerMaxHp: state.playerState.hp.max,
      playerArmor,
      playerGold: state.playerState.gold,
      relics,
    };

    try {
      await createCombatSession(session);
    } catch {
      // non-fatal
    }
  }

  res.json({ success: true, nodeType: node.type });
});

export default router;
