import { randomUUID } from 'crypto';
import { Router, Request, Response } from 'express';
import { getCombatSession, saveCombatSession, CombatSession } from '../../../src/session/combat-session';
import redis from '../../../src/lib/redis';
import { failRun, startRun } from '../../../src/dungeon/run';
import { defaultPlayerState } from '../../../src/game/models/player-state';
import type { DungeonNode } from '../../../src/dungeon/node-types';
import { Bag } from '../../../src/game/bag';
import { Chain } from '../../../src/game/chain';
import { analyzeChain, applyChainEffects } from '../../../src/game/elements/element-engine';
import { calculateDamage, applyArmor } from '../../../src/game/damage';
import { EnemyAI, EnemyType } from '../../../src/game/ai/enemy-ai';
import { dealDamage, isDead } from '../../../src/game/hp';
import { getSlowDamageMultiplier } from '../../../src/game/elements/ice';
import type { Stone as GameStone } from '../../../src/game/models/stone';
import { createElementalStone } from '../../../src/game/models/stone';
import type { PlacedStone as GamePlacedStone } from '../../../src/game/chain';
import type { CombatStateResponse, PlayStoneResponse, EndTurnResponse, UnplayStoneResponse } from '../../../src/types/api';
import { RelicType } from '../../../src/game/relics/common';
import { applyInfiniteBag, applyBloodPactEnd, applyTheLastStone, applyCurseOfGreed } from '../../../src/game/relics/legendary';
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

function toGamePlacedStones(stones: CombatSession['chain']['stones']): GamePlacedStone[] {
  return stones as unknown as GamePlacedStone[];
}

// Helper: reconstruct a Chain instance from serialised session data
function chainFromSession(session: CombatSession): Chain {
  return Chain.fromJSON(session.chain);
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
    chain: toGamePlacedStones(session.chain.stones),
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
    leftOpen: session.chain.leftOpen,
    rightOpen: session.chain.rightOpen,
    bag: session.bag.map(toGameStone),
  };

  res.json(response);
});

// POST /:runId/combat/play — play a stone from hand onto the chain
router.post('/:runId/combat/play', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;
  const { stoneIndex } = req.body as { stoneIndex?: unknown };

  // Validate stoneIndex before fetching session
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

  const hand = session.hand;
  if (stoneIndex < 0 || stoneIndex >= hand.length) {
    res.status(400).json({ error: 'stoneIndex out of range' });
    return;
  }

  const stone = toGameStone(hand[stoneIndex]);
  const chain = chainFromSession(session);
  const { right } = chain.canPlay(stone);

  if (!right) {
    res.status(400).json({ error: 'Stone cannot be played on the current chain' });
    return;
  }

  // Always play to the right; flipped=true when rightPip is the connecting pip
  const flipped = chain.stones.length > 0 && stone.rightPip === chain.rightOpen;
  chain.playStone(stone, 'right', flipped);

  // Remove stone from hand
  const newHand = [...hand.slice(0, stoneIndex), ...hand.slice(stoneIndex + 1)];

  // Persist updated session
  session.chain = chain.toJSON() as CombatSession['chain'];
  session.hand = newHand;

  try {
    await saveCombatSession(session);
  } catch {
    // non-fatal in tests
  }

  const response: PlayStoneResponse = {
    chain: toGamePlacedStones(session.chain.stones),
    hand: newHand.map(toGameStone),
    leftOpen: chain.leftOpen,
    rightOpen: chain.rightOpen,
  };

  res.json(response);
});

// POST /:runId/combat/unplay — remove a stone from the chain (and everything after it) back to hand
router.post('/:runId/combat/unplay', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;
  const { chainIndex } = req.body as { chainIndex?: unknown };

  if (chainIndex === undefined || chainIndex === null || typeof chainIndex !== 'number') {
    res.status(400).json({ error: 'chainIndex is required and must be a number' });
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

  const chainStones = session.chain.stones;
  if (chainIndex < 0 || chainIndex >= chainStones.length) {
    res.status(400).json({ error: 'chainIndex out of range' });
    return;
  }

  // Cannot remove the first/only stone if it came from an initial play
  // (removing index 0 would clear the whole chain — allow it)
  const removedPlaced = chainStones.slice(chainIndex);
  const keptPlaced = chainStones.slice(0, chainIndex);

  // Rebuild chain from kept stones
  const newChain = new Chain();
  for (const ps of keptPlaced) {
    newChain.playStone(toGameStone(ps.stone as any), ps.side, ps.flipped);
  }

  // Stones removed go back to hand (in original orientation)
  const returnedStones = removedPlaced.map((ps) => ps.stone);
  const newHand = [...session.hand, ...returnedStones];

  session.chain = newChain.toJSON() as CombatSession['chain'];
  session.hand = newHand;

  try {
    await saveCombatSession(session);
  } catch {
    // non-fatal
  }

  const response: UnplayStoneResponse = {
    chain: toGamePlacedStones(session.chain.stones),
    hand: newHand.map(toGameStone),
    leftOpen: newChain.leftOpen,
    rightOpen: newChain.rightOpen,
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

  // Reconstruct domain objects
  const chain = chainFromSession(session);

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

  // 1. Analyse chain for element effects (GlacialHeart: freeze at 1+, ElementalPrism: counts×2)
  const analysis = analyzeChain(chain, relics);

  // 2. Apply chain effects (PebbleCharm, IronSkin, StormAmulet wired inside)
  const effects = applyChainEffects(analysis, playerState, enemy, relics);

  // 3. Calculate player's damage from chain
  let chainDamage = calculateDamage(chain, {} as any, effects.lightningBonus).finalDamage;

  // TheLastStone: single-stone chain → (left + right) × 2
  if (relics.includes(RelicType.TheLastStone)) {
    const lastStoneDmg = applyTheLastStone(chain.stones as any);
    if (lastStoneDmg > 0) chainDamage = lastStoneDmg;
  }

  // InfiniteBag: return played stones to bag after this turn
  if (relics.includes(RelicType.InfiniteBag) && chain.stones.length > 0) {
    const playedStones = chain.stones.map(p => p.stone as GameStone);
    session.bag = applyInfiniteBag(playedStones, session.bag as any) as any;
  }

  // 4. Deal player damage to enemy
  dealDamage(enemy, chainDamage);

  // Check if enemy died
  if (isDead(enemy)) {
    session.enemyHp = enemy.hp.current;
    session.enemyStatus = enemy.status;
    session.chain = { stones: [], leftOpen: null, rightOpen: null };
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

        // TravelerBoots: +1 gold per stone in winning chain
        if (relics.includes(RelicType.TravelerBoots)) {
          const chainBonus = applyTravelerBoots(chain.stones.length);
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
      goldEarned,
      stoneRewards: stoneRewards ?? undefined,
      triggeredRelics,
    };
    res.json(response);
    return;
  }

  // 5. Enemy attacks (only if not stunned)
  let enemyAttackDamage = 0;
  const enemyEffects: string[] = [];

  if (!enemy.status.stunned) {
    const ai = new EnemyAI();
    const enemyHand: GameStone[] = [
      {
        id: 'e1',
        leftPip: Math.min(6, Math.floor(enemy.hp.current / 10)),
        rightPip: Math.min(6, Math.floor(enemy.hp.current / 5)),
        element: null,
      },
    ];
    const attack = ai.buildAttack(enemyHand, EnemyType.Normal);

    // FrostbiteRing: each slow stack reduces enemy damage by 30% instead of 20%
    const slowPct = relics.includes(RelicType.FrostbiteRing) ? 0.3 : 0.2;
    const slowMultiplier = getSlowDamageMultiplier(enemy, slowPct);
    enemyAttackDamage = Math.floor(attack.damage * slowMultiplier);

    // Apply armor first
    const armorResult = applyArmor(enemyAttackDamage, playerState.armor);
    playerState.armor = armorResult.armorRemaining;

    // Deal remaining damage to player
    if (armorResult.damageToDeal > 0) {
      dealDamage(playerState, armorResult.damageToDeal);

      // CurseOfGreed: lose 1 gold when hit
      if (relics.includes(RelicType.CurseOfGreed)) {
        const goldLost = applyCurseOfGreed(0, 'hit');
        session.playerGold = Math.max(0, (session.playerGold ?? 0) - goldLost);
        playerState.gold = session.playerGold;
      }
    }
  } else {
    enemyEffects.push('stunned');
    enemy.status.stunned = false;
  }

  // Tick burn on enemy — EmberCore: burn stacks don't decay
  if (enemy.status.burn > 0) {
    dealDamage(enemy, enemy.status.burn);
    if (!relics.includes(RelicType.EmberCore)) {
      enemy.status.burn = Math.max(0, enemy.status.burn - 1);
    }
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

  // Refill hand to 7 from bag
  const HAND_SIZE = 7;
  const bag = new Bag(session.bag as any[]);
  const needed = HAND_SIZE - session.hand.length;
  if (needed > 0) {
    const drawn = bag.draw(needed);
    session.hand = [...session.hand, ...drawn];
    session.bag = bag.stones;
  }

  // Reset chain and advance turn
  session.chain = { stones: [], leftOpen: null, rightOpen: null };
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

  const response: EndTurnResponse = {
    playerState,
    enemy,
    combatResult,
    enemyAttack: { damage: enemyAttackDamage, effects: enemyEffects },
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
