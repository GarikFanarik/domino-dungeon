import './RelicIcon.css';

interface Relic {
  type: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
}

interface Props {
  relic: Relic;
}

const RELIC_ICONS: Record<string, string> = {
  'worn-pouch':    '👝',
  'lucky-pip':     '🎲',
  'cracked-shield':'🛡️',
  'traveler-boots':'👢',
  'pebble-charm':  '🪨',
  'ember-core':    '🔥',
  'frostbite-ring':'💍',
  'storm-amulet':  '⚡',
  'venom-gland':   '☠️',
  'iron-skin':     '⚔️',
  'phoenix':       '🦅',
  'chain-master':  '🧤',
  'voltaic-lens':  '🔬',
  'glacial-heart': '❄️',
  'poison-tome':   '📗',
  'crown':         '👑',
  'prism':         '💎',
  'infinite-bag':  '♾️',
  'blood-pact':    '🩸',
  'last-stone':    '🎯',
  'curse-greed':   '💰',
};

export function RelicIcon({ relic }: Props) {
  const icon = RELIC_ICONS[relic.type] ?? '✨';
  return (
    <div
      className={`relic-icon relic-icon--${relic.rarity}`}
      title={relic.description}
    >
      <span className="relic-icon__symbol">{icon}</span>
      <span className="relic-icon__name">{relic.name}</span>
      <span className="relic-icon__rarity">{relic.rarity}</span>
    </div>
  );
}
