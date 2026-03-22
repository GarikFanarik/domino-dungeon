import seedrandom from 'seedrandom';
import { Run } from './run';

export interface EventChoice {
  label: string;
  description: string;
  effect: (run: Run) => EventResult;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  choices: EventChoice[];
}

export interface EventResult {
  description: string;
  goldChanged?: number;
  hpChanged?: number;
  stoneReward?: { element: string };
}

const EVENT_POOL: Event[] = [
  {
    id: 'cursed-stone',
    title: 'Cursed Stone',
    description: 'A cursed stone lies in your path.',
    choices: [
      { label: 'Take it', description: 'Accept the curse', effect: (_run) => ({ description: 'You take the cursed stone.', hpChanged: 0, stoneReward: { element: 'poison' } }) },
      { label: 'Destroy it', description: 'Smash the stone', effect: (_run) => ({ description: 'You destroy the stone.' }) },
    ],
  },
  {
    id: 'wounded-traveler',
    title: 'Wounded Traveler',
    description: 'A wounded traveler begs for help.',
    choices: [
      { label: 'Give 10 HP', description: 'Sacrifice HP for a relic', effect: (run) => { run.hp = Math.max(1, run.hp - 10); return { description: 'You heal the traveler and receive a gift.', hpChanged: -10 }; } },
      { label: 'Ignore', description: 'Pass by', effect: (_run) => ({ description: 'You walk past.' }) },
    ],
  },
  {
    id: 'ancient-altar',
    title: 'Ancient Altar',
    description: 'An ancient altar glows with power.',
    choices: [
      { label: 'Sacrifice HP', description: 'Lose 20% HP for 2 extra swaps', effect: (run) => { const cost = Math.floor(run.maxHp * 0.2); run.hp = Math.max(1, run.hp - cost); return { description: 'The altar grants you power.', hpChanged: -cost }; } },
      { label: 'Leave', description: 'Walk away', effect: (_run) => ({ description: 'You leave the altar.' }) },
    ],
  },
  {
    id: 'domino-shrine',
    title: 'Domino Shrine',
    description: 'A shrine dedicated to the art of dominoes.',
    choices: [
      { label: 'Pray', description: 'Receive a free elemental stone', effect: (_run) => ({ description: 'A stone appears in your bag.', stoneReward: { element: 'earth' } }) },
      { label: 'Ignore', description: 'Continue on', effect: (_run) => ({ description: 'You pass the shrine.' }) },
    ],
  },
  {
    id: 'mysterious-merchant',
    title: 'Mysterious Merchant',
    description: 'A hooded merchant offers rare wares.',
    choices: [
      { label: 'Pay 20g', description: 'Buy a random relic', effect: (run) => { if (run.gold >= 20) { run.gold -= 20; return { description: 'You acquire a rare relic.', goldChanged: -20 }; } return { description: 'Not enough gold.' }; } },
      { label: 'Refuse', description: 'Walk away', effect: (_run) => ({ description: 'You decline.' }) },
    ],
  },
  {
    id: 'old-library',
    title: 'Old Library',
    description: 'Dusty tomes line the shelves of a forgotten library.',
    choices: [
      { label: 'Study', description: 'Spend time reading for insight', effect: (_run) => ({ description: 'You gain forbidden knowledge.' }) },
      { label: 'Search for loot', description: 'Rummage for valuables', effect: (run) => { run.gold += 10; return { description: 'You find 10 gold among the books.', goldChanged: 10 }; } },
      { label: 'Leave', description: 'Ignore the library', effect: (_run) => ({ description: 'You walk away.' }) },
    ],
  },
  {
    id: 'healing-spring',
    title: 'Healing Spring',
    description: 'A bubbling spring emanates warm, golden light.',
    choices: [
      { label: 'Drink', description: 'Restore 15 HP', effect: (run) => { const restored = Math.min(15, run.maxHp - run.hp); run.hp = Math.min(run.maxHp, run.hp + 15); return { description: `You drink and restore ${restored} HP.`, hpChanged: restored }; } },
      { label: 'Fill a flask', description: 'Save for later (no immediate effect)', effect: (_run) => ({ description: 'You fill a flask with the water.' }) },
    ],
  },
];

export function getRandomEvent(act: number, seed: string): Event {
  const rng = seedrandom(seed);
  const idx = Math.floor(rng() * EVENT_POOL.length);
  return EVENT_POOL[idx];
}

export function resolveEventChoice(run: Run, event: Event, choiceIndex: number): EventResult {
  const choice = event.choices[choiceIndex];
  if (!choice) return { description: 'Invalid choice.' };
  return choice.effect(run);
}
