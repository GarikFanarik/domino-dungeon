import { randomUUID } from 'crypto';
import { Router, Request, Response } from 'express';
import { getCombatSession, saveCombatSession, CombatSession } from '../../../src/session/combat-session';
import redis from '../../../src/lib/redis';
import { failRun, startRun } from '../../../src/dungeon/run';
import { defaultPlayerState } from '../../../src/game/models/player-state';
import type { DungeonNode } from '../../../src/dungeon/node-types';
import { Bag } from '../../../src/game/bag';
import { Board } from '../../../src/game/board';
import { EnemyBoardAI } from '../../../src/game/ai/enemy-board-ai';
import { analyzeChain, applyChainEffects } from '../../../src/game/elements/element-engine';
import { calculateDamage, applyArmor } from '../../../src/game/damage';
import { dealDamage, isDead } from '../../../src/game/hp';
import { getSlowDamageMultiplier } from '../../../src/game/elements/ice';
import type { Stone as GameStone } from '../../../src/game/models/stone';
import { createElementalStone } from '../../../src/game/models/stone';
import type { CombatStateResponse, PlayStoneResponse, EndTurnResponse } from '../../../src/types/api';
import { RelicType } from '../../../src/game/relics/common';
import { applyInfiniteBag, applyBloodPactEnd, applyTheLastStone, applyCurseOfGreed } from '../../../src/game/relics/legendary';
import { applyPhoenixFeather, applyChainMastersGlove, applyVoltaicLens } from '../../../src/game/relics/epic';
import { applyTravelerBoots } from '../../../src/game/relics/common';

const router = Router();

const RUN_TTL = 86400;

function runKey(runId: string): string {
  return `run:${runId}`;
}

function activeRunKey(userId: string): string {
  return `active_run:${userId}`;
}

type RunState = {
  run: ReturnType<typeof startRun>;
  playerState: ReturnType<typeof defaultPlayerState>;
  map: DungeonNode[];
  currentNodeId: string | null;
  stones?: GameStone[];
};

async function getRunState(runId: string): Promise<RunState | null> {
  let raw: string | null = null;
  try {
    raw = await redis.get(runKey(runId));
  } catch {
    raw = null;
  }
  if (raw === null) return null;
  return JSON.parse(raw) as RunState;
}

async function saveRunState(runId: string, state: RunState): Promise<void> {
  await redis.set(runKey(runId), JSON.stringify(state), 'EX', RUN_TTL);
}

// Cast session stones to game types (element is compatible at runtime)
function toGameStone(s: CombatSession['hand'][number]): GameStone {
  return s as unknown as GameStone;
}

// GET /:runId/combat — return current combat state
router.get('/:runId/combat', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;

  let session: CombatSession | null = null;
  try {
    session = await getCombatSession(runId);
  } catch {
    session = null;
  }

  if (session === null) {
    res.status(404).json({ error: 'Combat session not found' });
    return;
  }

  const response: CombatStateResponse = {
    enemy: {
      id: session.enemyId,
      name: session.enemyId,
      hp: { current: session.enemyHp, max: session.enemyMaxHp },
      status: session.enemyStatus,
    },
    playerHand: session.hand.map(toGameStone),
    board: session.board,
    enemyHandCount: (session.enemyHand ?? []).length,
    playerState: {
      hp: { current: session.playerHp ?? 80, max: session.playerMaxHp ?? 80 },
      armor: session.playerArmor ?? 0,
      armorFortified: false,
      gold: session.playerGold ?? 0,
      relics: [],
    },
    turnNumber: session.turnNumber,
    phase: 'player-turn',
    swapsUsed: session.swapsUsed,
    swapsPerTurn: session.swapsPerTurn,
    bag: session.bag.map(toGameStone),
  };

  res.json(response);
});

// POST /:runId/combat/play — play a stone from hand onto the board
router.post('/:runId/combat/play', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;
  const { stoneIndex, side } = req.body as { stoneIndex?: unknown; side?: unknown };

  // Validate stoneIndex before fetching session
  if (stoneIndex === undefined || stoneIndex === null || typeof stoneIndex !== 'number') {
    res.status(400).json({ error: 'stoneIndex is required and must be a number' });
    return;
  }

  // Validate side
  if (side !== 'left' && side !== 'right') {
    res.status(400).json({ error: 'side must be "left" or "right"' });
    return;
  }

  let session: CombatSession | null = null;
  try {
    session = await getCombatSession(runId);
  } catch {
    session = null;
  }

  if (session === null) {
    res.status(404).json({ error: 'Combat session not found' });
    return;
  }

  const hand = session.hand;
  if (stoneIndex < 0 || stoneIndex >= hand.length) {
    res.status(400).json({ error: 'stoneIndex out of range' });
    return;
  }

  const stone = toGameStone(hand[stoneIndex]);
  const board = Board.fromJSON(session.board);

  // Return 400 if board is empty and side === 'left'
  if (board.leftOpen === null && board.rightOpen === null && side === 'left') {
    res.status(400).json({ error: 'Cannot play to the left on an empty board' });
    return;
  }

  // Validate: board.canPlay(stone)[side]
  const canPlay = board.canPlay(stone);
  if (!canPlay[side]) {
    res.status(400).json({ error: 'Stone cannot be played on the current board at that side' });
    return;
  }

  // Play the stone
  board.playStone(stone, side, 'player', session.turnNumber);

  // Remove stone from hand
  const newHand = [...hand.slice(0, stoneIndex), ...hand.slice(stoneIndex + 1)];

  // Persist updated session
  session.board = board.toJSON();
  session.hand = newHand;

  try {
    await saveCombatSession(session);
  } catch {
    // non-fatal in tests
  }

  const response: PlayStoneResponse = {
    board: board.toJSON(),
    hand: newHand.map(toGameStone),
  };

  res.json(response);
});

// POST /:runId/combat/swap — swap a stone in hand for one from the bag
router.post('/:runId/combat/swap', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;
  const { stoneIndex } = req.body as { stoneIndex?: unknown };

  if (stoneIndex === undefined || stoneIndex === null || typeof stoneIndex !== 'number') {
    res.status(400).json({ error: 'stoneIndex is required and must be a number' });
    return;
  }

  let session: CombatSession | null = null;
  try {
    session = await getCombatSession(runId);
  } catch {
    session = null;
  }

  if (session === null) {
    res.status(404).json({ error: 'Combat session not found' });
    return;
  }

  if (stoneIndex < 0 || stoneIndex >= session.hand.length) {
    res.status(400).json({ error: 'stoneIndex out of range' });
    return;
  }

  if (session.swapsUsed >= session.swapsPerTurn) {
    res.status(400).json({ error: 'No swaps remaining this turn' });
    return;
  }

  if (session.bag.length === 0) {
    res.status(400).json({ error: 'Bag is empty' });
    return;
  }

  // Swap: return current stone at stoneIndex to bag, draw top of bag
  const removed = session.hand[stoneIndex];
  const drawn = session.bag[0];

  const newHand = [
    ...session.hand.slice(0, stoneIndex),
    drawn,
    ...session.hand.slice(stoneIndex + 1),
  ];
  const newBag = [...session.bag.slice(1), removed];

  session.hand = newHand;
  session.bag = newBag;
  session.swapsUsed += 1;

  try {
    await saveCombatSession(session);
  } catch {
    // non-fatal in tests
  }

  res.json({ hand: newHand.map(toGameStone), swapsRemaining: session.swapsPerTurn - session.swapsUsed });
});

// POST /:runId/combat/end-turn — resolve player chain, run enemy turn
router.post('/:runId/combat/end-turn', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;

  let session: CombatSession | null = null;
  try {
    session = await getCombatSession(runId);
  } catch {
    session = null;
  }

  if (session === null) {
    res.status(404).json({ error: 'Combat session not found' });
    return;
  }

  const board = Board.fromJSON(session.board);
  const current = session.turnNumber;

  const enemy = {
    id: session.enemyId,
    name: session.enemyId,
    hp: { current: session.enemyHp, max: session.enemyMaxHp },
    status: session.enemyStatus,
  };

  const playerState = {
    hp: { current: session.playerHp ?? 80, max: session.playerMaxHp ?? 80 },
    armor: session.playerArmor ?? 0,
    armorFortified: false,
    gold: session.playerGold ?? 0,
    relics: [],
  };

  const relics = session.relics ?? [];

  // Steps 1-4: player damage
  const playerChain = board.toChainForTurn(current, 'player');

  // 1. Analyse chain for element effects
  const analysis = analyzeChain(playerChain, relics);

  // 2. Apply chain effects (PebbleCharm, IronSkin, StormAmulet wired inside)
  const effects = applyChainEffects(analysis, playerState, enemy, relics);

  // 3. Calculate player's damage from chain
  let chainDamage = calculateDamage(playerChain, {} as any, effects.lightningBonus).finalDamage;

  // Steps 5-10: relic bonuses
  const gloveTiles = board.getTilesForTurn(current, 'player');
  const gloveBase = session.stonesPlayedTotal ?? 0;

  // ChainMastersGlove: every 5th stone played (across the whole combat) deals double pip damage
  if (relics.includes(RelicType.ChainMastersGlove) && gloveTiles.length > 0) {
    let gloveBonus = 0;
    gloveTiles.forEach((tile, i) => {
      const pos = gloveBase + i + 1; // 1-indexed cumulative position
      const stonePipDmg = (tile.stone.leftPip + tile.stone.rightPip) * 2;
      gloveBonus += applyChainMastersGlove(pos, stonePipDmg) - stonePipDmg;
    });
    chainDamage += gloveBonus;
  }
  session.stonesPlayedTotal = gloveBase + gloveTiles.length;

  // TheLastStone: single-stone chain → (left + right) × 2
  if (relics.includes(RelicType.TheLastStone)) {
    const lastStoneDmg = applyTheLastStone(gloveTiles.map(t => ({ stone: t.stone, side: t.side, flipped: t.flipped })) as any);
    if (lastStoneDmg > 0) chainDamage = lastStoneDmg;
  }

  // VoltaicLens: Overload deals +15 bonus damage
  if (relics.includes(RelicType.VoltaicLens)) {
    chainDamage = applyVoltaicLens(analysis.overloadTriggered, chainDamage);
  }

  // InfiniteBag: return played stones to bag after this turn
  if (relics.includes(RelicType.InfiniteBag) && gloveTiles.length > 0) {
    const playedStones = gloveTiles.map(t => t.stone);
    session.bag = applyInfiniteBag(playedStones as any, session.bag as any) as any;
  }

  // Step 10-11: deal damage, check win
  dealDamage(enemy, chainDamage);

  // Check if enemy died
  if (isDead(enemy)) {
    session.enemyHp = enemy.hp.current;
    session.enemyStatus = enemy.status;
    session.board = board.toJSON();
    session.turnNumber += 1;
    session.swapsUsed = 0;

    let goldEarned = 0;
    let stoneRewards: Array<{ element: string; leftPip: number; rightPip: number }> | null = null;
    const triggeredRelics: string[] = [];

    // Sync player state back to run
    try {
      const runState = await getRunState(session.runId);
      if (runState) {
        const node = runState.map.find(n => n.id === runState.currentNodeId);
        if (node) node.completed = true;

        // Award gold based on node type
        const nodeType = node?.type;
        if (nodeType === 'boss') goldEarned = 40 + Math.floor(Math.random() * 11); // 40-50g
        else if (nodeType === 'elite') goldEarned = 20 + Math.floor(Math.random() * 6); // 20-25g
        else goldEarned = 10 + Math.floor(Math.random() * 6); // 10-15g

        // TravelerBoots fires on win only: +1 gold per stone in winning chain
        if (relics.includes(RelicType.TravelerBoots)) {
          const chainBonus = applyTravelerBoots(gloveTiles.length);
          goldEarned += chainBonus;
          if (chainBonus > 0) triggeredRelics.push(RelicType.TravelerBoots);
        }

        // CurseOfGreed: double gold reward
        if (relics.includes(RelicType.CurseOfGreed)) {
          goldEarned = applyCurseOfGreed(goldEarned, 'reward');
          triggeredRelics.push(RelicType.CurseOfGreed);
        }

        const currentGold = session.playerGold ?? 0;
        session.playerGold = currentGold + goldEarned;
        playerState.gold = session.playerGold;

        // BloodPact: restore 20 HP at end of won combat
        if (relics.includes(RelicType.BloodPact)) {
          const hpObj = { current: session.playerHp ?? 80, max: session.playerMaxHp ?? 80 };
          applyBloodPactEnd(hpObj);
          session.playerHp = hpObj.current;
          playerState.hp.current = hpObj.current;
          triggeredRelics.push(RelicType.BloodPact);
        }

        runState.playerState.hp.current = session.playerHp ?? runState.playerState.hp.current;
        runState.playerState.armor = session.playerArmor ?? runState.playerState.armor;
        runState.playerState.gold = session.playerGold;
        await saveRunState(session.runId, runState);

        // Generate stone reward options for elite/boss
        if (nodeType === 'elite' || nodeType === 'boss') {
          const allElements = ['fire', 'ice', 'lightning', 'poison', 'earth'];
          const seedStr = session.runId + session.turnNumber;
          let seedHash = 0;
          for (let i = 0; i < seedStr.length; i++) {
            seedHash = (Math.imul(31, seedHash) + seedStr.charCodeAt(i)) | 0;
          }
          seedHash = Math.abs(seedHash);
          const options: Array<{ element: string; leftPip: number; rightPip: number }> = [];
          const used = new Set<number>();
          for (let i = 0; i < 3; i++) {
            let idx = (seedHash + i * 7) % allElements.length;
            while (used.has(idx)) idx = (idx + 1) % allElements.length;
            used.add(idx);
            options.push({
              element: allElements[idx],
              leftPip: 1 + Math.floor(Math.random() * 6),
              rightPip: 1 + Math.floor(Math.random() * 6),
            });
          }
          stoneRewards = options;
          session.pendingStoneRewards = options;
        }
      }
    } catch {
      // non-fatal
    }

    try {
      await saveCombatSession(session);
    } catch {
      // non-fatal in tests
    }

    const response: EndTurnResponse = {
      playerState,
      enemy,
      combatResult: 'player-won',
      dotDamage: { burn: 0, poison: 0 },
      goldEarned,
      stoneRewards: stoneRewards ?? undefined,
      triggeredRelics,
    };
    res.json(response);
    return;
  }

  // Step 12 & 13: enemy AI plays and damage calculation (skipped if stunned/frozen)
  let enemyWasSkipped = false;
  let enemySkipReason: 'stunned' | 'frozen' = 'stunned';
  let rawEnemyDamage = 0;
  let armorBlocked = 0;
  let netEnemyDamage = 0;
  let enemyTilesPlayed: ReturnType<typeof board.getTilesForTurn> = [];

  if (!enemy.status.stunned && !enemy.status.frozen) {
    const ai = new EnemyBoardAI();
    session.enemyHand = ai.playTurn(board, (session.enemyHand ?? []) as any[], current) as any[];

    enemyTilesPlayed = board.getTilesForTurn(current, 'enemy');
    const enemyChain = board.toChainForTurn(current, 'enemy');
    const enemyDamageResult = calculateDamage(enemyChain, {} as any);
    rawEnemyDamage = enemyDamageResult.finalDamage;

    // FrostbiteRing: each slow stack reduces enemy damage by 30% instead of 20%
    const slowPct = relics.includes(RelicType.FrostbiteRing) ? 0.3 : 0.2;
    const slowMultiplier = getSlowDamageMultiplier(enemy, slowPct);
    rawEnemyDamage = Math.floor(rawEnemyDamage * slowMultiplier);

    // Step 14: apply armor
    const armorResult = applyArmor(rawEnemyDamage, playerState.armor);
    playerState.armor = armorResult.armorRemaining;
    armorBlocked = rawEnemyDamage - armorResult.damageToDeal;
    netEnemyDamage = armorResult.damageToDeal;

    // Deal remaining damage to player
    if (armorResult.damageToDeal > 0) {
      dealDamage(playerState, armorResult.damageToDeal);

      // PhoenixFeather: survive a lethal hit once per run, restore 30% max HP
      if (relics.includes(RelicType.PhoenixFeather) && isDead(playerState)) {
        const phoenixState = { phoenixUsed: session.phoenixUsed ?? false };
        const restored = applyPhoenixFeather(playerState.hp.current, playerState.hp.max, phoenixState);
        if (restored > 0) {
          playerState.hp.current = restored;
          session.phoenixUsed = true;
        }
      }

      // CurseOfGreed: lose 1 gold when hit
      if (relics.includes(RelicType.CurseOfGreed)) {
        const goldLost = applyCurseOfGreed(0, 'hit');
        session.playerGold = Math.max(0, (session.playerGold ?? 0) - goldLost);
        playerState.gold = session.playerGold;
      }
    }
  } else {
    enemyWasSkipped = true;
    if (enemy.status.stunned) {
      enemySkipReason = 'stunned';
      enemy.status.stunned = false;
    } else if (enemy.status.frozen) {
      enemySkipReason = 'frozen';
      enemy.status.frozen = false;
    }
  }

  // Steps 15-17: DoT, status decay
  // Tick burn — EmberCore: burn stacks don't decay
  let burnDamage = 0;
  if (enemy.status.burn > 0) {
    burnDamage = enemy.status.burn;  // capture before dealDamage
    dealDamage(enemy, burnDamage);
    if (!relics.includes(RelicType.EmberCore)) {
      enemy.status.burn = Math.max(0, enemy.status.burn - 1);
    }
  }

  // Tick poison — VenomGland: poison stacks don't decay
  let poisonDamage = 0;
  if (enemy.status.poison > 0) {
    poisonDamage = enemy.status.poison;  // capture before dealDamage
    dealDamage(enemy, poisonDamage);
    if (!relics.includes(RelicType.VenomGland)) {
      enemy.status.poison = Math.max(0, enemy.status.poison - 1);
    }
  }

  // Slow decays by 1 each turn
  if (enemy.status.slow > 0) {
    enemy.status.slow = Math.max(0, enemy.status.slow - 1);
  }

  // Check if player died
  const playerDied = isDead(playerState);
  const combatResult: EndTurnResponse['combatResult'] = playerDied ? 'player-died' : 'ongoing';

  if (playerDied) {
    try {
      const runState = await getRunState(session.runId);
      if (runState) {
        const node = runState.map.find(n => n.id === runState.currentNodeId);
        if (node) node.completed = true;
        failRun(runState.run);
        await saveRunState(session.runId, runState);
        await redis.del(activeRunKey(runState.run.userId));
      }
    } catch {
      // non-fatal
    }
  }

  // Refill both hands from bag
  const HAND_SIZE = session.handSize ?? 7;
  const bag = new Bag(session.bag as any[]);
  const playerNeeded = Math.max(0, HAND_SIZE - session.hand.length);
  if (playerNeeded > 0) {
    session.hand = [...session.hand, ...bag.draw(playerNeeded)];
  }
  const enemyNeeded = Math.max(0, session.enemyHandSize - session.enemyHand.length);
  if (enemyNeeded > 0) {
    session.enemyHand = [...session.enemyHand, ...bag.draw(enemyNeeded)];
  }
  session.bag = bag.stones;

  // Steps 18-19: save board state, increment turn
  session.board = board.toJSON();
  session.turnNumber += 1;
  session.swapsUsed = 0;
  session.enemyHp = enemy.hp.current;
  session.enemyStatus = enemy.status;
  session.playerHp = playerState.hp.current;
  session.playerArmor = playerState.armor;

  try {
    await saveCombatSession(session);
  } catch {
    // non-fatal in tests
  }

  // Build enemyAttack with stonesPlayed[]
  const stonesPlayed = enemyTilesPlayed.map(t => ({ leftPip: t.stone.leftPip, rightPip: t.stone.rightPip }));

  const response: EndTurnResponse = {
    playerState,
    enemy,
    combatResult,
    ...(enemyWasSkipped
      ? { enemySkipped: { reason: enemySkipReason } }
      : {
          enemyAttack: enemyTilesPlayed.length > 0
            ? { stonesPlayed, rawDamage: rawEnemyDamage, armorBlocked, damage: netEnemyDamage, effects: [] }
            : undefined,
        }),
    dotDamage: { burn: burnDamage, poison: poisonDamage },
    hand: session.hand.map(toGameStone),
  };

  res.json(response);
});

// POST /:runId/combat/claim-stone — claim one of the pending stone reward options
router.post('/:runId/combat/claim-stone', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;
  const { element } = req.body as { element?: string };

  if (!element) {
    res.status(400).json({ error: 'element is required' });
    return;
  }

  let session: CombatSession | null = null;
  try {
    session = await getCombatSession(runId);
  } catch {
    session = null;
  }

  if (session === null) {
    res.status(404).json({ error: 'Combat session not found' });
    return;
  }

  if (!session.pendingStoneRewards || session.pendingStoneRewards.length === 0) {
    res.status(400).json({ error: 'No stone reward available' });
    return;
  }

  const match = session.pendingStoneRewards.find(r => r.element === element);
  if (!match) {
    res.status(400).json({ error: 'Chosen element is not in the pending rewards' });
    return;
  }

  const stone: GameStone = {
    id: randomUUID(),
    leftPip: match.leftPip,
    rightPip: match.rightPip,
    element: match.element as any,
  };

  try {
    const runState = await getRunState(runId);
    if (runState) {
      if (!runState.stones) {
        const defaultBag = new Bag();
        runState.stones = [...defaultBag.stones];
      }
      runState.stones.push(stone);
      await saveRunState(runId, runState);
    }
  } catch {
    // non-fatal
  }

  session.pendingStoneRewards = [];

  try {
    await saveCombatSession(session);
  } catch {
    // non-fatal
  }

  res.json({ success: true, stone });
});

export default router;
