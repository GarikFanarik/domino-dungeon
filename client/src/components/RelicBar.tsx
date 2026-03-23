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
          <RelicIcon
            key={id}
            relic={def}
            glowing={triggeredRelics.includes(id)}
          />
        );
      })}
    </div>
  );
}
