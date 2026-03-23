import seedrandom from 'seedrandom';
import { Run } from './run';
import { COMMON_RELICS, RelicDefinition } from '../game/relics/common';
import { RARE_RELICS } from '../game/relics/rare';
import { EPIC_RELICS } from '../game/relics/epic';
import { LEGENDARY_RELICS } from '../game/relics/legendary';

export const ALL_RELICS: RelicDefinition[] = [...COMMON_RELICS, ...RARE_RELICS, ...EPIC_RELICS, ...LEGENDARY_RELICS];

const RARITY_WEIGHTS = { common: 60, rare: 25, epic: 12, legendary: 3 };

function pickByRarity(rng: () => number, pool: RelicDefinition[]): RelicDefinition {
  const roll = rng() * 100;
  let cumulative = 0;
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    cumulative += weight;
    if (roll < cumulative) {
      const matching = pool.filter(r => r.rarity === rarity);
      if (matching.length > 0) return matching[Math.floor(rng() * matching.length)];
    }
  }
  return pool[Math.floor(rng() * pool.length)];
}

export type RelicOffer = RelicDefinition[];

export function generateRelicOffer(act: number, seed: string, bossOffer = false): RelicOffer {
  const rng = seedrandom(seed);
  const offer: RelicDefinition[] = [];
  const used = new Set<string>();

  if (bossOffer && act >= 2) {
    // Guarantee at least 1 rare+
    const rarePlus = ALL_RELICS.filter(r => r.rarity === 'rare' || r.rarity === 'epic' || r.rarity === 'legendary');
    const guaranteed = rarePlus[Math.floor(rng() * rarePlus.length)];
    offer.push(guaranteed);
    used.add(guaranteed.id);
  }

  while (offer.length < 3) {
    const picked = pickByRarity(rng, ALL_RELICS.filter(r => !used.has(r.id)));
    offer.push(picked);
    used.add(picked.id);
  }

  return offer;
}

export function pickRelic(run: Run, relicId: string): void {
  run.relics.push(relicId);
}
