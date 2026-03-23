import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { RelicIcon } from './RelicIcon';
import { RELIC_DEFINITIONS } from '../data/relics';
import './RelicBar.css';

export function RelicBar() {
  const { runId, screen, triggeredRelics } = useGame();
  const [relicIds, setRelicIds] = useState<string[]>([]);

  useEffect(() => {
    if (!runId) return;
    fetch(`/api/run/${runId}`)
      .then(r => r.json())
      .then(data => setRelicIds(data.playerState?.relics ?? []))
      .catch(() => {});
  }, [runId, screen]);

  if (!runId || relicIds.length === 0) return null;

  return (
    <div className="relic-bar">
      {relicIds.map(id => {
        const def = RELIC_DEFINITIONS[id];
        if (!def) return null;
        return (
          <div key={id} className="relic-bar__slot">
            <RelicIcon
              relic={def}
              glowing={triggeredRelics.includes(id)}
            />
            <div className="relic-bar__tooltip">
              <strong className="relic-bar__tooltip-name">{def.name}</strong>
              <span className="relic-bar__tooltip-desc">{def.description}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
