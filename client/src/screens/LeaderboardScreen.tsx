import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';

interface LeaderboardEntry {
  rank: number;
  discordUserId: string;
  displayName: string;
  score: number;
  actsCleared: number;
  enemiesDefeated: number;
  runDate: string;
}

export function LeaderboardScreen() {
  const { navigate } = useGame();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/leaderboard?limit=20')
      .then((r) => r.json())
      .then((data) => { setEntries(data.entries || []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  return (
    <div style={{ padding: '1rem' }}>
      <h1>🏆 Leaderboard</h1>
      <button onClick={() => navigate('menu')}>Back to Menu</button>

      {loaded && entries.length === 0 && <p>No runs yet — be the first!</p>}

      {entries.length > 0 && (
        <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr><th>Rank</th><th>Player</th><th>Score</th><th>Acts</th></tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.discordUserId}>
                <td>#{e.rank}</td>
                <td>{e.displayName}</td>
                <td>{e.score}</td>
                <td>{e.actsCleared}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
