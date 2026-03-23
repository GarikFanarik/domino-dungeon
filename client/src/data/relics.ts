export interface RelicDef {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
}

export const RELIC_DEFINITIONS: Record<string, RelicDef> = {
  // Common
  'worn-pouch':          { id: 'worn-pouch',          name: 'Worn Pouch',          rarity: 'common',    description: 'Bag starts with 2 extra random stones.' },
  'lucky-pip':           { id: 'lucky-pip',           name: 'Lucky Pip',           rarity: 'common',    description: 'Once per combat: re-roll one stone in hand.' },
  'cracked-shield':      { id: 'cracked-shield',      name: 'Cracked Shield',      rarity: 'common',    description: 'Start each combat with 5 Armor.' },
  'travelers-boots':     { id: 'travelers-boots',     name: "Traveler's Boots",    rarity: 'common',    description: 'Gain 5 bonus gold after every elite/boss fight.' },
  'pebble-charm':        { id: 'pebble-charm',        name: 'Pebble Charm',        rarity: 'common',    description: 'Earth element grants +1 extra Armor per stone.' },
  // Rare
  'ember-core':          { id: 'ember-core',          name: 'Ember Core',          rarity: 'rare',      description: 'Fire stones deal +1 Burn stack per stone.' },
  'frostbite-ring':      { id: 'frostbite-ring',      name: 'Frostbite Ring',      rarity: 'rare',      description: 'Ice chains of 2+ also slow enemy by 1 additional stack.' },
  'storm-amulet':        { id: 'storm-amulet',        name: 'Storm Amulet',        rarity: 'rare',      description: 'Lightning bonus increased to +5 flat damage per stone.' },
  'venom-gland':         { id: 'venom-gland',         name: 'Venom Gland',         rarity: 'rare',      description: 'Poison ticks deal +1 additional damage per stack.' },
  'iron-skin':           { id: 'iron-skin',           name: 'Iron Skin',           rarity: 'rare',      description: 'Armor cap raised from 20 to 35.' },
  // Epic
  'phoenix-feather':     { id: 'phoenix-feather',     name: 'Phoenix Feather',     rarity: 'epic',      description: 'Once per run: survive a lethal hit with 1 HP.' },
  'chain-masters-glove': { id: 'chain-masters-glove', name: "Chain Master's Glove",rarity: 'epic',      description: 'Every 5th stone played deals double pip damage.' },
  'voltaic-lens':        { id: 'voltaic-lens',        name: 'Voltaic Lens',        rarity: 'epic',      description: 'Overload also deals 15 bonus damage directly.' },
  'glacial-heart':       { id: 'glacial-heart',       name: 'Glacial Heart',       rarity: 'epic',      description: 'Frozen enemies receive 50% more damage.' },
  'poison-tome':         { id: 'poison-tome',         name: 'Poison Tome',         rarity: 'epic',      description: 'Start combat with 3 Poison stacks on enemy.' },
  // Legendary
  'domino-crown':        { id: 'domino-crown',        name: 'Domino Crown',        rarity: 'legendary', description: 'Doubles no longer end the chain.' },
  'elemental-prism':     { id: 'elemental-prism',     name: 'Elemental Prism',     rarity: 'legendary', description: 'Neutral stones count as ALL elements.' },
  'infinite-bag':        { id: 'infinite-bag',        name: 'Infinite Bag',        rarity: 'legendary', description: 'Stones played return to bag after combat.' },
  'blood-pact':          { id: 'blood-pact',          name: 'Blood Pact',          rarity: 'legendary', description: 'Start combat: trade 10% max HP for +1 swap.' },
  'the-last-stone':      { id: 'the-last-stone',      name: 'The Last Stone',      rarity: 'legendary', description: 'When 1 stone left in hand, it deals 3× damage.' },
  'curse-of-greed':      { id: 'curse-of-greed',      name: 'Curse of Greed',      rarity: 'legendary', description: 'Gold rewards doubled, shop prices doubled.' },
};
