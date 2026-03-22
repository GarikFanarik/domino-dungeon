import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { DominoStone } from '../components/DominoStone';

const baseStone = { id: 's1', leftPip: 3, rightPip: 5, element: null };

describe('DominoStone', () => {
  it('renders accessible label with pip values', () => {
    render(<DominoStone stone={baseStone} />);
    expect(screen.getByText('3|5')).toBeInTheDocument();
  });

  it('fires onClick when clicked and not disabled', () => {
    const onClick = vi.fn();
    render(<DominoStone stone={baseStone} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('domino-stone'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', () => {
    const onClick = vi.fn();
    render(<DominoStone stone={baseStone} onClick={onClick} disabled />);
    fireEvent.click(screen.getByTestId('domino-stone'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies selected class when selected', () => {
    render(<DominoStone stone={baseStone} selected />);
    expect(screen.getByTestId('domino-stone')).toHaveClass('domino-tile--selected');
  });

  it('applies disabled class when disabled', () => {
    render(<DominoStone stone={baseStone} disabled />);
    expect(screen.getByTestId('domino-stone')).toHaveClass('domino-tile--disabled');
  });

  it('applies placed class when placed', () => {
    render(<DominoStone stone={baseStone} placed />);
    expect(screen.getByTestId('domino-stone')).toHaveClass('domino-tile--placed');
  });

  it('applies horizontal class when horizontal', () => {
    render(<DominoStone stone={baseStone} horizontal />);
    expect(screen.getByTestId('domino-stone')).toHaveClass('domino-tile--horizontal');
  });

  it('applies element class for fire stone', () => {
    const stone = { ...baseStone, element: 'fire' };
    render(<DominoStone stone={stone} />);
    expect(screen.getByTestId('domino-stone')).toHaveClass('domino-tile--fire');
  });

  it('applies element class for ice stone', () => {
    const stone = { ...baseStone, element: 'ice' };
    render(<DominoStone stone={stone} />);
    expect(screen.getByTestId('domino-stone')).toHaveClass('domino-tile--ice');
  });

  it('applies element class for lightning stone', () => {
    const stone = { ...baseStone, element: 'lightning' };
    render(<DominoStone stone={stone} />);
    expect(screen.getByTestId('domino-stone')).toHaveClass('domino-tile--lightning');
  });

  it('applies element class for poison stone', () => {
    const stone = { ...baseStone, element: 'poison' };
    render(<DominoStone stone={stone} />);
    expect(screen.getByTestId('domino-stone')).toHaveClass('domino-tile--poison');
  });

  it('applies element class for earth stone', () => {
    const stone = { ...baseStone, element: 'earth' };
    render(<DominoStone stone={stone} />);
    expect(screen.getByTestId('domino-stone')).toHaveClass('domino-tile--earth');
  });

  it('shows element badge img for elemental stone', () => {
    const stone = { ...baseStone, element: 'fire' };
    render(<DominoStone stone={stone} />);
    expect(screen.getByRole('img', { name: 'fire' })).toBeInTheDocument();
  });

  it('does not show element badge for null element', () => {
    render(<DominoStone stone={baseStone} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('has no element class for null element', () => {
    render(<DominoStone stone={baseStone} />);
    const el = screen.getByTestId('domino-stone');
    expect(el.className).toBe('domino-tile');
  });
});
