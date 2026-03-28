import { Router, Request, Response } from 'express';
import redis from '../../../src/lib/redis';
import { generateShopInventory, buyItem, ShopState } from '../../../src/dungeon/shop';
import { restHeal } from '../../../src/dungeon/rest-node';
import { getRandomEvent, resolveEventChoice } from '../../../src/dungeon/events';
import { generateRelicOffer, pickRelic } from '../../../src/dungeon/relic-offer';
import { RelicType } from '../../../src/game/relics/common';
import { applyDominoCrown } from '../../../src/game/relics/legendary';
import { startRun } from '../../../src/dungeon/run';
import { defaultPlayerState } from '../../../src/game/models/player-state';
import type { DungeonNode } from '../../../src/dungeon/node-types';
import { Bag } from '../../../src/game/bag';
import { createElementalStone } from '../../../src/game/models/stone';
import type { Stone } from '../../../src/game/models/stone';

const router = Router();

const RUN_TTL = 86400; // 24 hours in seconds

function runKey(runId: string): string {
  return `run:${runId}`;
}

type RunState = {
  run: ReturnType<typeof startRun>;
  playerState: ReturnType<typeof defaultPlayerState>;
  map: DungeonNode[];
  currentNodeId: string | null;
  shopSoldIds?: string[];
  stones?: Stone[];
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

// ── Shop ──────────────────────────────────────────────────────────────────────

function nameFor(type: string, element?: string): string {
  switch (type) {
    case 'stone': return element ? `${element.charAt(0).toUpperCase() + element.slice(1)} Stone` : 'Elemental Stone';
    case 'relic': return 'Mystery Relic';
    case 'potion': return 'Health Potion';
    case 'removal': return 'Stone Removal';
    default: return type;
  }
}

function descFor(type: string, element?: string): string {
  switch (type) {
    case 'stone': return element ? `Add a ${element} elemental stone to your bag` : 'Add a stone to your bag';
    case 'relic': return 'A powerful artifact';
    case 'potion': return 'Restore 30 HP';
    case 'removal': return 'Remove a stone from your bag';
    default: return '';
  }
}

// GET /:runId/shop
router.get('/:runId/shop', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;
  const state = await getRunState(runId);
  if (!state) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  const items = generateShopInventory(state.run.currentAct, state.run.seed);
  const shopSoldIds = state.shopSoldIds || [];

  res.json({
    items: items.map(item => {
      const element = (item.payload as any)?.element ?? null;
      const relicId = (item.payload as any)?.relicId ?? null;
      return {
        id: item.id,
        type: item.type,
        name: nameFor(item.type, element ?? undefined),
        description: descFor(item.type, element ?? undefined),
        cost: item.price,
        sold: shopSoldIds.includes(item.id),
        element,
        relicId,
      };
    }),
    playerGold: state.run.gold ?? state.playerState?.gold ?? 0,
  });
});

// POST /:runId/shop/buy
router.post('/:runId/shop/buy', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;
  const { itemId } = req.body as { itemId?: string };

  if (!itemId) {
    res.status(400).json({ error: 'itemId is required' });
    return;
  }

  const state = await getRunState(runId);
  if (!state) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  const items = generateShopInventory(state.run.currentAct, state.run.seed);
  const shopSoldIds = state.shopSoldIds || [];
  const shop: ShopState = { items, soldIds: new Set(shopSoldIds) };

  const result = buyItem(state.run, shop, itemId);
  if (!result.success) {
    res.status(400).json({ error: result.reason });
    return;
  }

  if (result.item && result.item.type === 'stone') {
    const element = (result.item.payload as any)?.element;
    if (element) {
      const newStone = createElementalStone(element);
      if (!state.stones) {
        const defaultBag = new Bag();
        state.stones = [...defaultBag.stones];
      }
      state.stones.push(newStone);
    }
  }

  if (result.item && result.item.type === 'relic') {
    const relicId = (result.item.payload as any)?.relicId;
    if (relicId) pickRelic(state.run, relicId);
  }

  state.shopSoldIds = [...shopSoldIds, itemId];
  await saveRunState(runId, state);
  res.json({ success: true, item: result.item, run: state.run });
});

// POST /:runId/shop/leave
router.post('/:runId/shop/leave', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;
  const state = await getRunState(runId);
  if (!state) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  // Mark current node complete
  const node = state.map.find(n => n.id === state.currentNodeId);
  if (node) node.completed = true;

  await saveRunState(runId, state);
  res.json({ success: true });
});

// ── Rest ──────────────────────────────────────────────────────────────────────

// POST /:runId/rest/heal
router.post('/:runId/rest/heal', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;
  const state = await getRunState(runId);
  if (!state) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  const healed = restHeal(state.run);
  const healNode = state.map.find(n => n.id === state.currentNodeId);
  if (healNode) healNode.completed = true;
  await saveRunState(runId, state);
  res.json({ newHp: state.run.hp, healed });
});

// POST /:runId/rest/upgrade
router.post('/:runId/rest/upgrade', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;

  const state = await getRunState(runId);
  if (!state) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  // Mark node complete and return success
  const node = state.map.find(n => n.id === state.currentNodeId);
  if (node) node.completed = true;
  await saveRunState(runId, state);
  res.json({ success: true, message: 'Stone upgraded!' });
});

// ── Event ─────────────────────────────────────────────────────────────────────

// GET /:runId/event
router.get('/:runId/event', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;
  const state = await getRunState(runId);
  if (!state) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  const event = getRandomEvent(state.run.currentAct, state.run.seed);
  // Return event without the effect functions (not serialisable)
  const safeEvent = {
    id: event.id,
    title: event.title,
    description: event.description,
    choices: event.choices.map(c => ({ label: c.label, description: c.description })),
  };
  res.json(safeEvent);
});

// POST /:runId/event/resolve
router.post('/:runId/event/resolve', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;
  const { choiceIndex } = req.body as { choiceIndex?: unknown };

  if (choiceIndex === undefined || choiceIndex === null || typeof choiceIndex !== 'number') {
    res.status(400).json({ error: 'choiceIndex must be a number' });
    return;
  }

  const state = await getRunState(runId);
  if (!state) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  const event = getRandomEvent(state.run.currentAct, state.run.seed);
  const result = resolveEventChoice(state.run, event, choiceIndex);

  if (result.stoneReward) {
    const newStone = createElementalStone(result.stoneReward.element as any);
    if (!state.stones) {
      const defaultBag = new Bag();
      state.stones = [...defaultBag.stones];
    }
    state.stones.push(newStone);
  }

  // Mark node complete
  const eventNode = state.map.find(n => n.id === state.currentNodeId);
  if (eventNode) eventNode.completed = true;
  await saveRunState(runId, state);
  res.json({ message: result.description, goldChanged: result.goldChanged, hpChanged: result.hpChanged, stoneReward: result.stoneReward ?? null });
});

// ── Relic Offer ───────────────────────────────────────────────────────────────

// GET /:runId/relic-offer
router.get('/:runId/relic-offer', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;
  const state = await getRunState(runId);
  if (!state) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  const offerCount = state.run.relicOfferCount ?? 0;
  state.run.relicOfferCount = offerCount + 1;
  await saveRunState(runId, state);

  const offerSeed = `${state.run.seed}-relic-${offerCount}`;
  const offer = generateRelicOffer(state.run.currentAct, offerSeed);
  res.json(offer.map(r => ({ relicId: r.id, name: r.name, rarity: r.rarity, description: r.description })));
});

// POST /:runId/relic-offer/pick
router.post('/:runId/relic-offer/pick', async (req: Request, res: Response) => {
  const runId = req.params['runId'] as string;
  const { relicId } = req.body as { relicId?: string };

  if (!relicId) {
    res.status(400).json({ error: 'relicId is required' });
    return;
  }

  const state = await getRunState(runId);
  if (!state) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  pickRelic(state.run, relicId);

  // DominoCrown: remove 5 random stones, add doubles 2|2–6|6
  if (relicId === RelicType.DominoCrown) {
    if (!state.stones) {
      const defaultBag = new Bag();
      state.stones = [...defaultBag.stones];
    }
    state.stones = applyDominoCrown(state.stones);
  }

  const relicNode = state.map.find(n => n.id === state.currentNodeId);
  if (relicNode) relicNode.completed = true;
  await saveRunState(runId, state);
  res.json({ success: true, relics: state.run.relics, run: state.run });
});

export default router;
