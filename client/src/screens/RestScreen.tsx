import { useState } from 'react';
import { useGame } from '../context/GameContext';
import './RestScreen.css';

interface Props { runId: string; }

export function RestScreen({ runId }: Props) {
  const { navigate } = useGame();
  const [result, setResult] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleHeal() {
    const res = await fetch(`/api/run/${runId}/rest/heal`, { method: 'POST' });
    const data = await res.json();
    setResult(`Healed ${data.healed} HP! New HP: ${data.newHp}`);
    setDone(true);
  }

  async function handleUpgrade() {
    const res = await fetch(`/api/run/${runId}/rest/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setResult(res.ok ? 'Stone upgraded!' : data.error || 'Could not upgrade');
    setDone(true);
  }

  return (
    <div className="rest-screen">
      <div className="rest-bg" />
      <div className="rest-tint" />
      <div className="rest-content">
        {result ? (
          <>
            <div className="rest-result">{result}</div>
            <button className="btn-rest-continue" onClick={() => navigate('dungeon-map')}>
              Continue
            </button>
          </>
        ) : (
          <>
            <h2 className="rest-title">⛺ Campfire Rest</h2>
            <p className="rest-subtitle">Choose one action</p>
            <div className="rest-choices">
              <button className="rest-choice-card" onClick={handleHeal} disabled={done}>
                <span className="rest-choice-icon">❤️</span>
                <span className="rest-choice-title">Rest &amp; Heal</span>
                <span className="rest-choice-hint">Restore 30% HP</span>
              </button>
              <button className="rest-choice-card" onClick={handleUpgrade} disabled={done}>
                <span className="rest-choice-icon">🪨</span>
                <span className="rest-choice-title">Upgrade Stone</span>
                <span className="rest-choice-hint">Improve a stone's pip by 1</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
