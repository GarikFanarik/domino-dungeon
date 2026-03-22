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

export default function App() {
  return (
    <GameProvider>
      <AppRouter />
    </GameProvider>
  );
}
