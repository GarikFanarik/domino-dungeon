export const RELIC_IMAGES: Record<string, string> = {
  // Common
  'worn-pouch':          '/assets/relics/common/coin_purse.png',
  'lucky-pip':           '/assets/relics/common/golden_domino.png',
  'cracked-shield':      '/assets/relics/common/iron_shield.png',
  'travelers-boots':     '/assets/relics/common/worn_boots.png',
  'pebble-charm':        '/assets/relics/common/river_pebble.png',
  // Rare
  'ember-core':          '/assets/relics/rare/red_crystal_core.png',
  'frostbite-ring':      '/assets/relics/rare/Freeze_ring.png',
  'storm-amulet':        '/assets/relics/rare/dark_amulet.png',
  'venom-gland':         '/assets/relics/rare/green_sac.png',
  'iron-skin':           '/assets/relics/rare/rough_skin.png',
  // Epic
  'phoenix-feather':     '/assets/relics/epic/fire_feather.png',
  'chain-masters-glove': '/assets/relics/epic/combat_glove.png',
  'voltaic-lens':        '/assets/relics/epic/voltaic_lens.png',
  'glacial-heart':       '/assets/relics/epic/lucid-origin_A_heart-shaped_block_of_deep_blue_ice_with_a_frozen_pulse_visible_inside_crystal-0-Photoroom.png',
  'poison-tome':         '/assets/relics/epic/grimoire.png',
  // Legendary
  'domino-crown':        '/assets/relics/legendary/Domino_Crown.png',
  'elemental-prism':     '/assets/relics/legendary/Elemental_Prism.png',
  'infinite-bag':        '/assets/relics/legendary/Infinite_Bag.png',
  'blood-pact':          '/assets/relics/legendary/Blood_Pact.png',
  'the-last-stone':      '/assets/relics/legendary/THE_LAST_STONE.png',
  'curse-of-greed':      '/assets/relics/legendary/Curse_of_Greed.png',
};

export function relicImage(type: string): string | undefined {
  return RELIC_IMAGES[type];
}
