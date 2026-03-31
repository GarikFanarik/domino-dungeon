import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { DominoStone } from '../components/DominoStone';
import './RestScreen.css';

interface Stone {
  id: string;
  leftPip: number;
  rightPip: number;
  element: string | null;
}

interface Props { runId: string; }

export function RestScreen({ runId }: Props) {
  const { navigate } = useGame();
  const [result, setResult] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [stones, setStones] = useState<Stone[] | null>(null);
  const [selectedStone, setSelectedStone] = useState<Stone | null>(null);

  async function handleHeal() {
    const res = await fetch(`/api/run/${runId}/rest/heal`, { method: 'POST' });
    const data = await res.json();
    setResult(`Healed ${data.healed} HP!`);
    setDone(true);
  }

  async function handleShowUpgrade() {
    const res = await fetch(`/api/run/${runId}/rest/stones`);
    const data = await res.json();
    setStones(data.stones ?? []);
  }

  async function handleUpgrade(side: 'left' | 'right') {
    if (!selectedStone) return;
    const res = await fetch(`/api/run/${runId}/rest/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stoneId: selectedStone.id, side }),
    });
    const data = await res.json();
    if (res.ok) {
      const pipLabel = side === 'left' ? 'left' : 'right';
      setResult(`Upgraded ${pipLabel} pip of [${selectedStone.leftPip}|${selectedStone.rightPip}]!`);
      setDone(true);
      setStones(null);
      setSelectedStone(null);
    } else {
      setResult(data.error || 'Upgrade failed');
    }
  }

  // Stone picker view
  if (stones !== null && !done) {
    return (
      <div className="rest-screen">
        <div className="rest-bg" />
        <div className="rest-tint" />
        <div className="rest-content">
          <h2 className="rest-title">Upgrade a Stone</h2>
          {!selectedStone ? (
            <>
              <p className="rest-subtitle">Select a stone to upgrade</p>
              <div className="rest-stone-grid">
                {stones.map(stone => (
                  <DominoStone
                    key={stone.id}
                    stone={stone}
                    horizontal
                    onClick={() => setSelectedStone(stone)}
                  />
                ))}
              </div>
              <button className="btn-rest-back" onClick={() => setStones(null)}>Back</button>
            </>
          ) : (
            <>
              <p className="rest-subtitle">Which pip to upgrade?</p>
              <div className="rest-upgrade-preview">
                <DominoStone stone={selectedStone} horizontal selected />
              </div>
              <div className="rest-choices">
                <button className="rest-choice-card" onClick={() => handleUpgrade('left')}>
                  <span className="rest-choice-icon">⬅️</span>
                  <span className="rest-choice-title">Left pip +1</span>
                  <span className="rest-choice-hint">{selectedStone.leftPip} → {Math.min(6, selectedStone.leftPip + 1)}</span>
                </button>
                <button className="rest-choice-card" onClick={() => handleUpgrade('right')}>
                  <span className="rest-choice-icon">➡️</span>
                  <span className="rest-choice-title">Right pip +1</span>
                  <span className="rest-choice-hint">{selectedStone.rightPip} → {Math.min(6, selectedStone.rightPip + 1)}</span>
                </button>
              </div>
              <button className="btn-rest-back" onClick={() => setSelectedStone(null)}>Back</button>
            </>
          )}
        </div>
      </div>
    );
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
              <button className="rest-choice-card" onClick={handleShowUpgrade} disabled={done}>
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
