import { render, screen, act } from '@testing-library/react';
import { GameProvider, useGame } from '../context/GameContext';

type Screen = 'loading' | 'menu' | 'dungeon-map' | 'combat' | 'shop' | 'rest' | 'event' | 'relic-selection' | 'run-summary' | 'leaderboard';

function TestComponent() {
  const { screen, navigate } = useGame();
  return (
    <div>
      <span data-testid="screen">{screen}</span>
      <button onClick={() => navigate('menu')}>Go to menu</button>
      <button onClick={() => navigate('combat')}>Go to combat</button>
    </div>
  );
}

describe('GameContext', () => {
  it('starts on loading screen', () => {
    render(<GameProvider><TestComponent /></GameProvider>);
    expect(screen.getByTestId('screen')).toHaveTextContent('loading');
  });

  it('navigate() changes the active screen', () => {
    render(<GameProvider><TestComponent /></GameProvider>);
    act(() => {
      screen.getByText('Go to menu').click();
    });
    expect(screen.getByTestId('screen')).toHaveTextContent('menu');
  });

  it('navigate() can transition to any valid screen', () => {
    render(<GameProvider><TestComponent /></GameProvider>);
    act(() => {
      screen.getByText('Go to combat').click();
    });
    expect(screen.getByTestId('screen')).toHaveTextContent('combat');
  });
});
