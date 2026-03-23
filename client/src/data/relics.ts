export interface RelicDef {
  type: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
}

export const RELIC_DEFINITIONS: Record<string, RelicDef> = {
  // Common
  'worn-pouch':          { type: 'worn-pouch',          name: 'Worn Pouch',          rarity: 'common',    description: 'Draw 1 extra stone at the start of each turn.' },
  'lucky-pip':           { type: 'lucky-pip',           name: 'Lucky Pip',           rarity: 'common',    description: 'Gain 1 extra swap per turn.' },
  'cracked-shield':      { type: 'cracked-shield',      name: 'Cracked Shield',      rarity: 'common',    description: 'Start each combat with 5 Armor.' },
  'travelers-boots':     { type: 'travelers-boots',     name: "Traveler's Boots",    rarity: 'common',    description: 'Gain gold equal to your chain length on combat win.' },
  'pebble-charm':        { type: 'pebble-charm',        name: 'Pebble Charm',        rarity: 'common',    description: 'Earth Fortify triggers at 2 stones instead of 3.' },
  // Rare
  'ember-core':          { type: 'ember-core',          name: 'Ember Core',          rarity: 'rare',      description: 'Burn stacks no longer decay each turn.' },
  'frostbite-ring':      { type: 'frostbite-ring',      name: 'Frostbite Ring',      rarity: 'rare',      description: 'Slowed enemies take 30% less damage (instead of 20%).' },
  'storm-amulet':        { type: 'storm-amulet',        name: 'Storm Amulet',        rarity: 'rare',      description: 'Lightning deals +5 flat damage per stone (instead of +3).' },
  'venom-gland':         { type: 'venom-gland',         name: 'Venom Gland',         rarity: 'rare',      description: 'Poison stacks no longer decay each turn.' },
  'iron-skin':           { type: 'iron-skin',           name: 'Iron Skin',           rarity: 'rare',      description: 'Gain 1 extra Armor whenever you gain Armor.' },
  // Epic
  'phoenix-feather':     { type: 'phoenix-feather',     name: 'Phoenix Feather',     rarity: 'epic',      description: 'Once per run: survive a lethal hit and restore 30% max HP.' },
  'chain-masters-glove': { type: 'chain-masters-glove', name: "Chain Master's Glove",rarity: 'epic',      description: 'Every 5th stone played deals double pip damage.' },
  'voltaic-lens':        { type: 'voltaic-lens',        name: 'Voltaic Lens',        rarity: 'epic',      description: 'Overload also deals 15 bonus damage directly.' },
  'glacial-heart':       { type: 'glacial-heart',       name: 'Glacial Heart',       rarity: 'epic',      description: 'Freeze triggers with 1 Ice stone instead of 2.' },
  'poison-tome':         { type: 'poison-tome',         name: 'Poison Tome',         rarity: 'epic',      description: 'Start combat with 3 Poison stacks on enemy.' },
  // Legendary
  'domino-crown':        { type: 'domino-crown',        name: 'Domino Crown',        rarity: 'legendary', description: 'Remove 5 random stones; gain 2|2, 3|3, 4|4, 5|5, 6|6 doubles.' },
  'elemental-prism':     { type: 'elemental-prism',     name: 'Elemental Prism',     rarity: 'legendary', description: 'Each stone counts twice for element effects.' },
  'infinite-bag':        { type: 'infinite-bag',        name: 'Infinite Bag',        rarity: 'legendary', description: 'Stones played return to your bag after each turn.' },
  'blood-pact':          { type: 'blood-pact',          name: 'Blood Pact',          rarity: 'legendary', description: 'Start combat: lose 10 HP. Win combat: restore 20 HP.' },
  'the-last-stone':      { type: 'the-last-stone',      name: 'The Last Stone',      rarity: 'legendary', description: 'A chain of exactly 1 stone deals (left + right) × 2 damage.' },
  'curse-of-greed':      { type: 'curse-of-greed',      name: 'Curse of Greed',      rarity: 'legendary', description: 'Gold rewards doubled. Lose 1 gold each time you are hit.' },
};
