import React, { createContext, useContext, useState } from 'react';
import { useDiscordSdk, type DiscordAuth } from '../hooks/useDiscordSdk';

export type Screen =
  | 'loading'
  | 'menu'
  | 'dungeon-map'
  | 'combat'
  | 'shop'
  | 'rest'
  | 'event'
  | 'relic-selection'
  | 'run-summary'
  | 'leaderboard';

interface GameContextValue {
  screen: Screen;
  navigate: (screen: Screen) => void;
  runId: string | null;
  setRunId: (id: string | null) => void;
  auth: DiscordAuth | null;
  discordReady: boolean;
  discordError: string | null;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<Screen>('loading');
  const [runId, setRunId] = useState<string | null>(null);
  const { ready: discordReady, auth, error: discordError } = useDiscordSdk();

  return (
    <GameContext.Provider value={{ screen, navigate: setScreen, runId, setRunId, auth, discordReady, discordError }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
