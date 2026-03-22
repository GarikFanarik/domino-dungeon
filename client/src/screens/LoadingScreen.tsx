import { useEffect } from 'react';
import { useDiscordSdk } from '../hooks/useDiscordSdk';
import { useGame } from '../context/GameContext';

export function LoadingScreen() {
  const { ready, error } = useDiscordSdk();
  const { navigate } = useGame();

  useEffect(() => {
    if (ready) navigate('menu');
  }, [ready, navigate]);

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>Failed to connect: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <p>Connecting to Discord...</p>
    </div>
  );
}
