import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import './RunSummaryScreen.css';

interface RunSummary {
  status: string;
  actsCleared: number;
  enemiesDefeated: number;
  totalDamage: number;
  relicsCollected: number;
  goldEarned: number;
  causeOfDeath?: string;
  score: number;
}

interface Props { runId: string; }

export function RunSummaryScreen({ runId }: Props) {
  const { navigate, setRunId } = useGame();
  const [summary, setSummary] = useState<RunSummary | null>(null);

  useEffect(() => {
    fetch(`/api/run/${runId}/summary`)
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => {});
  }, [runId]);

  if (!summary) {
    return <div className="summary-loading">Tallying the carnage…</div>;
  }

  const won = summary.status === 'COMPLETED';

  return (
    <div className="summary-screen">
      <div className="summary-bg" />
      <div className="summary-content">
        <h1 className={`summary-heading ${won ? 'summary-heading--won' : 'summary-heading--died'}`}>
          {won ? 'Run Complete' : 'You Died'}
        </h1>

        {!won && summary.causeOfDeath && (
          <p className="summary-cause">Cause of death: {summary.causeOfDeath}</p>
        )}

        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat-label">Acts Cleared</span>
            <span className="summary-stat-value">{summary.actsCleared}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Enemies Defeated</span>
            <span className="summary-stat-value">{summary.enemiesDefeated}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Total Damage</span>
            <span className="summary-stat-value">{summary.totalDamage.toLocaleString()}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Relics</span>
            <span className="summary-stat-value">{summary.relicsCollected}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Gold</span>
            <span className="summary-stat-value">{summary.goldEarned}g</span>
          </div>
          <div className="summary-stat summary-stat--score">
            <span className="summary-stat-label">Score</span>
            <span className="summary-stat-value">{summary.score.toLocaleString()}</span>
          </div>
        </div>

        <div className="summary-buttons">
          <button
            className="btn-summary"
            onClick={() => { setRunId(null); navigate('menu'); }}
          >
            Play Again
          </button>
          <button
            className="btn-summary btn-summary--leaderboard"
            onClick={() => navigate('leaderboard')}
          >
            Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}
