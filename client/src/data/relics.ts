export interface RelicDef {
  type: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
}

export const RELIC_DEFINITIONS: Record<string, RelicDef> = {
  // Common
  'worn-pouch':          { type: 'worn-pouch',          name: 'Worn Pouch',          rarity: 'common',    description: 'Bag starts with 2 extra random stones.' },
  'lucky-pip':           { type: 'lucky-pip',           name: 'Lucky Pip',           rarity: 'common',    description: 'Once per combat: re-roll one stone in hand.' },
  'cracked-shield':      { type: 'cracked-shield',      name: 'Cracked Shield',      rarity: 'common',    description: 'Start each combat with 5 Armor.' },
  'travelers-boots':     { type: 'travelers-boots',     name: "Traveler's Boots",    rarity: 'common',    description: 'Gain 5 bonus gold after every elite/boss fight.' },
  'pebble-charm':        { type: 'pebble-charm',        name: 'Pebble Charm',        rarity: 'common',    description: 'Earth element grants +1 extra Armor per stone.' },
  // Rare
  'ember-core':          { type: 'ember-core',          name: 'Ember Core',          rarity: 'rare',      description: 'Fire stones deal +1 Burn stack per stone.' },
  'frostbite-ring':      { type: 'frostbite-ring',      name: 'Frostbite Ring',      rarity: 'rare',      description: 'Ice chains of 2+ also slow enemy by 1 additional stack.' },
  'storm-amulet':        { type: 'storm-amulet',        name: 'Storm Amulet',        rarity: 'rare',      description: 'Lightning bonus increased to +5 flat damage per stone.' },
  'venom-gland':         { type: 'venom-gland',         name: 'Venom Gland',         rarity: 'rare',      description: 'Poison ticks deal +1 additional damage per stack.' },
  'iron-skin':           { type: 'iron-skin',           name: 'Iron Skin',           rarity: 'rare',      description: 'Armor cap raised from 20 to 35.' },
  // Epic
  'phoenix-feather':     { type: 'phoenix-feather',     name: 'Phoenix Feather',     rarity: 'epic',      description: 'Once per run: survive a lethal hit with 1 HP.' },
  'chain-masters-glove': { type: 'chain-masters-glove', name: "Chain Master's Glove",rarity: 'epic',      description: 'Every 5th stone played deals double pip damage.' },
  'voltaic-lens':        { type: 'voltaic-lens',        name: 'Voltaic Lens',        rarity: 'epic',      description: 'Overload also deals 15 bonus damage directly.' },
  'glacial-heart':       { type: 'glacial-heart',       name: 'Glacial Heart',       rarity: 'epic',      description: 'Frozen enemies receive 50% more damage.' },
  'poison-tome':         { type: 'poison-tome',         name: 'Poison Tome',         rarity: 'epic',      description: 'Start combat with 3 Poison stacks on enemy.' },
  // Legendary
  'domino-crown':        { type: 'domino-crown',        name: 'Domino Crown',        rarity: 'legendary', description: 'Doubles no longer end the chain.' },
  'elemental-prism':     { type: 'elemental-prism',     name: 'Elemental Prism',     rarity: 'legendary', description: 'Neutral stones count as ALL elements.' },
  'infinite-bag':        { type: 'infinite-bag',        name: 'Infinite Bag',        rarity: 'legendary', description: 'Stones played return to bag after combat.' },
  'blood-pact':          { type: 'blood-pact',          name: 'Blood Pact',          rarity: 'legendary', description: 'Start combat: trade 10% max HP for +1 swap.' },
  'the-last-stone':      { type: 'the-last-stone',      name: 'The Last Stone',      rarity: 'legendary', description: 'When 1 stone left in hand, it deals 3× damage.' },
  'curse-of-greed':      { type: 'curse-of-greed',      name: 'Curse of Greed',      rarity: 'legendary', description: 'Gold rewards doubled, shop prices doubled.' },
};
