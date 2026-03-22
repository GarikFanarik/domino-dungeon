import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { useDiscordSdk } from '../hooks/useDiscordSdk';
import './MenuScreen.css';

export function MenuScreen() {
  const { navigate, setRunId } = useGame();
  const { auth } = useDiscordSdk();
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for active run
    fetch('/api/run/active', {
      headers: { 'x-discord-user-id': auth?.userId || '' },
    })
      .then((r) => r.json())
      .then((data) => setActiveRunId(data.runId))
      .catch(() => {});
  }, [auth]);

  async function handleStartRun() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/run/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordUserId: auth?.userId || '' }),
      });
      const data = await res.json();
      if (!res.ok || !data.runId) {
        setError(data.error || 'Failed to start run');
        return;
      }
      setRunId(data.runId);
      navigate('dungeon-map');
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  async function handleResumeRun() {
    if (activeRunId) {
      setRunId(activeRunId);
      navigate('dungeon-map');
    }
  }

  return (
    <div className="menu-screen">
      <div className="menu-bg" />
      <div className="menu-content">
        <h1 className="menu-title">Domino Dungeon</h1>
        <p className="menu-subtitle">Dark Fantasy Roguelike</p>
        {auth && <p className="menu-welcome">Welcome, {auth.username}</p>}

        {error && <p style={{ color: '#ff8888', fontSize: '0.8rem' }}>{error}</p>}
        <div className="menu-buttons">
          {activeRunId && (
            <button className="btn-menu btn-menu--resume" onClick={handleResumeRun}>
              Resume Run
            </button>
          )}
          <button className="btn-menu" onClick={handleStartRun} disabled={loading}>
            {loading ? 'Starting…' : 'Start New Run'}
          </button>
          <button className="btn-menu btn-menu--leaderboard" onClick={() => navigate('leaderboard')}>
            Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}
