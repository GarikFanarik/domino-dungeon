import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
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

export interface GameContextValue {
  screen: Screen;
  navigate: (screen: Screen) => void;
  runId: string | null;
  setRunId: (id: string | null) => void;
  auth: DiscordAuth | null;
  discordReady: boolean;
  discordError: string | null;
  triggeredRelics: string[];
  flashRelics: (ids: string[]) => void;
}

export const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<Screen>('loading');
  const [runId, setRunId] = useState<string | null>(null);
  const [triggeredRelics, setTriggeredRelics] = useState<string[]>([]);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { ready: discordReady, auth, error: discordError } = useDiscordSdk();

  const flashRelics = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    if (clearTimer.current) clearTimeout(clearTimer.current);
    setTriggeredRelics(ids);
    clearTimer.current = setTimeout(() => setTriggeredRelics([]), 1200);
  }, []);

  return (
    <GameContext.Provider value={{ screen, navigate: setScreen, runId, setRunId, auth, discordReady, discordError, triggeredRelics, flashRelics }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
