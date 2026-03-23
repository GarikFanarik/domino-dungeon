import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { relicImage } from '../utils/relicImage';
import './RelicSelectionScreen.css';

interface RelicOffer { relicId: string; name: string; rarity: string; description: string; }
interface Props { runId: string; }

function rarityClass(rarity: string): string {
  const r = rarity.toLowerCase();
  if (r === 'legendary') return 'legendary';
  if (r === 'epic') return 'epic';
  if (r === 'rare') return 'rare';
  return 'common';
}

export function RelicSelectionScreen({ runId }: Props) {
  const { navigate } = useGame();
  const [offer, setOffer] = useState<RelicOffer[]>([]);

  useEffect(() => {
    fetch(`/api/run/${runId}/relic-offer`)
      .then((r) => r.json())
      .then((data) => setOffer(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [runId]);

  async function handlePick(relicId: string) {
    await fetch(`/api/run/${runId}/relic-offer/pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relicId }),
    });
    navigate('dungeon-map');
  }

  if (offer.length === 0) {
    return <div className="relic-loading">Summoning relics…</div>;
  }

  return (
    <div className="relic-screen">
      <div className="relic-bg" />
      <div className="relic-content">
        <h2 className="relic-title">Choose Your Relic</h2>
        <div className="relic-cards">
          {offer.map((relic) => {
            const rc = rarityClass(relic.rarity);
            const imgSrc = relicImage(relic.relicId);
            return (
              <div
                key={relic.relicId}
                className={`relic-card relic-card--${rc}`}
                onClick={() => handlePick(relic.relicId)}
              >
                {imgSrc && (
                  <img
                    src={imgSrc}
                    alt={relic.name}
                    className="relic-card__art"
                    data-rarity={rc}
                  />
                )}
                <div className="relic-name">{relic.name}</div>
                <div className={`relic-rarity relic-rarity--${rc}`}>{relic.rarity}</div>
                <div className="relic-description">{relic.description}</div>
                <button className="btn-relic-select" onClick={(e) => { e.stopPropagation(); handlePick(relic.relicId); }}>
                  Select
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
