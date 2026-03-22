import { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import './LoadingScreen.css';

const TILES = [
  { left: 2, right: 3 },
  { left: 0, right: 4 },
  { left: 3, right: 3 },
  { left: 1, right: 6 },
  { left: 4, right: 2 },
];

export function LoadingScreen() {
  const { discordReady: ready, discordError: error, navigate } = useGame();

  useEffect(() => {
    if (ready) navigate('menu');
  }, [ready, navigate]);

  if (error) {
    return (
      <div className="loading-screen loading-screen--error">
        <h1 className="loading-title">DOMINO DUNGEON</h1>
        <div className="loading-tiles">
          {TILES.map((_t, i) => (
            <div key={i} className="loading-tile loading-tile--facedown" data-testid="loading-tile" />
          ))}
        </div>
        <p className="loading-error">{error}</p>
        <button className="loading-retry" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="loading-screen">
      <h1 className="loading-title">DOMINO DUNGEON</h1>
      <div className="loading-tiles">
        {TILES.map((t, i) => (
          <div
            key={i}
            className="loading-tile"
            data-testid="loading-tile"
            style={{ animationDelay: `${i * 0.18}s` }}
          >
            <span className="loading-tile-pips">{t.left}|{t.right}</span>
          </div>
        ))}
      </div>
      <p className="loading-message">Connecting to Discord...</p>
    </div>
  );
}
