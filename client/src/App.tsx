import { useRef } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { LoadingScreen } from './screens/LoadingScreen';
import { MenuScreen } from './screens/MenuScreen';
import { DungeonMapScreen } from './screens/DungeonMapScreen';
import { CombatScreen } from './screens/CombatScreen';
import { ShopScreen } from './screens/ShopScreen';
import { RestScreen } from './screens/RestScreen';
import { EventScreen } from './screens/EventScreen';
import { RelicSelectionScreen } from './screens/RelicSelectionScreen';
import { RunSummaryScreen } from './screens/RunSummaryScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { RelicBar } from './components/RelicBar';
import './App.css';

const RELIC_BAR_SCREENS = new Set(['dungeon-map', 'combat', 'shop', 'rest', 'event', 'relic-selection']);

function AppRouter() {
  const { screen, runId } = useGame();
  switch (screen) {
    case 'loading': return <LoadingScreen />;
    case 'menu': return <MenuScreen />;
    case 'dungeon-map': return <DungeonMapScreen runId={runId || ''} />;
    case 'combat': return <CombatScreen runId={runId || ''} />;
    case 'shop': return <ShopScreen runId={runId || ''} />;
    case 'rest': return <RestScreen runId={runId || ''} />;
    case 'event': return <EventScreen runId={runId || ''} />;
    case 'relic-selection': return <RelicSelectionScreen runId={runId || ''} />;
    case 'run-summary': return <RunSummaryScreen runId={runId || ''} />;
    case 'leaderboard': return <LeaderboardScreen />;
    default: return <LoadingScreen />;
  }
}

function AppContent() {
  const { screen } = useGame();
  return (
    <>
      <AppRouter />
      {RELIC_BAR_SCREENS.has(screen) && <RelicBar />}
    </>
  );
}

export default function App() {
  const canvasRef = useRef<HTMLDivElement>(null);

  return (
    <GameProvider>
      <div ref={canvasRef} className="game-canvas">
        <AppContent />
      </div>
    </GameProvider>
  );
}
