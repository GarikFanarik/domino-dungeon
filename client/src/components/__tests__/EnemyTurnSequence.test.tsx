import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnemyTurnSequence } from '../EnemyTurnSequence';

const normalAttack  = { stone: { leftPip: 5, rightPip: 3 }, rawDamage: 8, armorBlocked: 4, damage: 4 };
const noArmorAttack = { stone: { leftPip: 5, rightPip: 3 }, rawDamage: 8, armorBlocked: 0, damage: 8 };
const fullAbsorb    = { stone: { leftPip: 5, rightPip: 3 }, rawDamage: 8, armorBlocked: 8, damage: 0 };
const dotDamage     = { burn: 3, poison: 2 };
const zeroDot       = { burn: 0, poison: 0 };

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('EnemyTurnSequence', () => {
  it('always renders exactly 5 seq-step divs', () => {
    const { container } = render(
      <EnemyTurnSequence enemyName="Skeleton" attack={normalAttack} dotDamage={zeroDot} onDone={vi.fn()} />
    );
    expect(container.querySelectorAll('.seq-step')).toHaveLength(5);
  });

  it('renders stone pips and armor step and HP step for normalAttack', () => {
    render(<EnemyTurnSequence enemyName="Skeleton" attack={normalAttack} dotDamage={zeroDot} onDone={vi.fn()} />);
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText(/4 blocked/)).toBeTruthy();
    expect(screen.getByText(/−4 HP/)).toBeTruthy();
  });

  it('armor step is visibility:hidden when armorBlocked === 0', () => {
    const { container } = render(
      <EnemyTurnSequence enemyName="Skeleton" attack={noArmorAttack} dotDamage={zeroDot} onDone={vi.fn()} />
    );
    const steps = container.querySelectorAll('.seq-step');
    expect((steps[1] as HTMLElement).style.visibility).toBe('hidden');
  });

  it('HP step is visibility:hidden when damage === 0', () => {
    const { container } = render(
      <EnemyTurnSequence enemyName="Skeleton" attack={fullAbsorb} dotDamage={zeroDot} onDone={vi.fn()} />
    );
    const steps = container.querySelectorAll('.seq-step');
    expect((steps[2] as HTMLElement).style.visibility).toBe('hidden');
  });

  it('DOT steps are visibility:hidden when zeroDot', () => {
    const { container } = render(
      <EnemyTurnSequence enemyName="Skeleton" attack={normalAttack} dotDamage={zeroDot} onDone={vi.fn()} />
    );
    const steps = container.querySelectorAll('.seq-step');
    expect((steps[3] as HTMLElement).style.visibility).toBe('hidden');
    expect((steps[4] as HTMLElement).style.visibility).toBe('hidden');
  });

  it('renders burn and poison DOT when dotDamage present', () => {
    render(<EnemyTurnSequence enemyName="Skeleton" attack={normalAttack} dotDamage={dotDamage} onDone={vi.fn()} />);
    expect(screen.getByText(/3.*Skeleton|burn.*3/i)).toBeTruthy();
    expect(screen.getByText(/2.*Skeleton|poison.*2/i)).toBeTruthy();
  });

  it('renders stun banner (not attack steps) when skipReason=stunned', () => {
    const { container } = render(
      <EnemyTurnSequence enemyName="Skeleton" skipReason="stunned" dotDamage={zeroDot} onDone={vi.fn()} />
    );
    expect(screen.getByText(/stunned/i)).toBeTruthy();
    const steps = container.querySelectorAll('.seq-step');
    // slots 2 and 3 (armor, HP) hidden
    expect((steps[1] as HTMLElement).style.visibility).toBe('hidden');
    expect((steps[2] as HTMLElement).style.visibility).toBe('hidden');
  });

  it('renders frozen banner text when skipReason=frozen', () => {
    render(<EnemyTurnSequence enemyName="Skeleton" skipReason="frozen" dotDamage={zeroDot} onDone={vi.fn()} />);
    expect(screen.getByText(/frozen/i)).toBeTruthy();
  });

  it('onDone called after 2500ms for normal attack', () => {
    const onDone = vi.fn();
    render(<EnemyTurnSequence enemyName="Skeleton" attack={normalAttack} dotDamage={zeroDot} onDone={onDone} />);
    vi.advanceTimersByTime(2499);
    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('onDone called after 1200ms for stunned with no DOT', () => {
    const onDone = vi.fn();
    render(<EnemyTurnSequence enemyName="Skeleton" skipReason="stunned" dotDamage={zeroDot} onDone={onDone} />);
    vi.advanceTimersByTime(1200);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('onDone called after 2200ms for stunned with DOT', () => {
    const onDone = vi.fn();
    render(<EnemyTurnSequence enemyName="Skeleton" skipReason="stunned" dotDamage={dotDamage} onDone={onDone} />);
    vi.advanceTimersByTime(2199);
    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
