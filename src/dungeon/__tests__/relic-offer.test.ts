import { startRun } from '../run';
import { generateRelicOffer, pickRelic, RelicOffer } from '../relic-offer';

describe('Relic acquisition', () => {
  test('generateRelicOffer returns exactly 3 relics', () => {
    const offer = generateRelicOffer(1, 'seed1');
    expect(offer.length).toBe(3);
  });

  test('all offered relics have valid rarity', () => {
    const offer = generateRelicOffer(1, 'seed1');
    offer.forEach(r => {
      expect(['common', 'rare', 'epic', 'legendary']).toContain(r.rarity);
    });
  });

  test('same seed produces same offer', () => {
    const o1 = generateRelicOffer(1, 'fixed');
    const o2 = generateRelicOffer(1, 'fixed');
    expect(o1.map(r => r.id)).toEqual(o2.map(r => r.id));
  });

  test('pickRelic adds relic id to run relics', () => {
    const run = startRun('u1', 's1');
    const offer = generateRelicOffer(1, 'seed');
    pickRelic(run, offer[0].id);
    expect(run.relics).toContain(offer[0].id);
  });

  test('pickRelic can pick any of the 3 offered', () => {
    const run = startRun('u1', 's1');
    const offer = generateRelicOffer(1, 'seed');
    pickRelic(run, offer[2].id);
    expect(run.relics).toContain(offer[2].id);
  });

  test('different relicOfferCount seeds produce different offers', () => {
    const seed = 'run-seed-abc';
    const o1 = generateRelicOffer(1, `${seed}-relic-0`);
    const o2 = generateRelicOffer(1, `${seed}-relic-1`);
    expect(o1.map(r => r.id)).not.toEqual(o2.map(r => r.id));
  });

  test('act 2+ boss offer has at least 1 Rare+ relic', () => {
    // Run multiple seeds to check the guarantee
    let foundRarePlus = false;
    for (let i = 0; i < 20; i++) {
      const offer = generateRelicOffer(2, `seed-${i}`, true); // bossOffer=true
      if (offer.some(r => r.rarity === 'rare' || r.rarity === 'epic' || r.rarity === 'legendary')) {
        foundRarePlus = true;
        break;
      }
    }
    expect(foundRarePlus).toBe(true);
  });
});
