import { relicImage } from '../utils/relicImage';
import './RelicIcon.css';

interface Relic {
  type: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
}

interface Props {
  relic: Relic;
  glowing?: boolean;
}

export function RelicIcon({ relic, glowing = false }: Props) {
  const imageSrc = relicImage(relic.type);
  return (
    <div
      className={`relic-icon relic-icon--${relic.rarity}${glowing ? ' relic-icon--glowing' : ''}`}
      title={relic.description}
    >
      <div className="relic-icon__symbol">
        {imageSrc
          ? <img src={imageSrc} alt={relic.name} className="relic-icon__img" />
          : <span>✨</span>
        }
      </div>
    </div>
  );
}
