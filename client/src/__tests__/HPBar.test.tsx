import { render, screen } from '@testing-library/react';
import { HPBar } from '../components/HPBar';

describe('HPBar', () => {
  it('shows current/max HP text by default', () => {
    render(<HPBar current={60} max={80} />);
    expect(screen.getByText('60/80 HP')).toBeInTheDocument();
  });

  it('hides HP text when showNumbers is false', () => {
    render(<HPBar current={60} max={80} showNumbers={false} />);
    expect(screen.queryByText(/HP/)).not.toBeInTheDocument();
  });

  it('sets fill width to correct percentage', () => {
    const { container } = render(<HPBar current={40} max={80} />);
    const fill = container.querySelector('.hp-bar-fill') as HTMLElement;
    expect(fill.style.width).toBe('50%');
  });

  it('clamps fill width to 0% when current is 0', () => {
    const { container } = render(<HPBar current={0} max={80} />);
    const fill = container.querySelector('.hp-bar-fill') as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });

  it('clamps fill width to 100% when current exceeds max', () => {
    const { container } = render(<HPBar current={100} max={80} />);
    const fill = container.querySelector('.hp-bar-fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  it('applies green class when HP is above 60%', () => {
    const { container } = render(<HPBar current={65} max={80} />);
    const fill = container.querySelector('.hp-bar-fill') as HTMLElement;
    expect(fill).toHaveClass('hp-bar-fill--high');
  });

  it('applies yellow class when HP is between 30% and 60%', () => {
    const { container } = render(<HPBar current={35} max={80} />);
    const fill = container.querySelector('.hp-bar-fill') as HTMLElement;
    expect(fill).toHaveClass('hp-bar-fill--mid');
  });

  it('applies red class when HP is below 30%', () => {
    const { container } = render(<HPBar current={20} max={80} />);
    const fill = container.querySelector('.hp-bar-fill') as HTMLElement;
    expect(fill).toHaveClass('hp-bar-fill--low');
  });

  it('applies red class at exactly 0% HP', () => {
    const { container } = render(<HPBar current={0} max={80} />);
    const fill = container.querySelector('.hp-bar-fill') as HTMLElement;
    expect(fill).toHaveClass('hp-bar-fill--low');
  });

  it('applies green class at exactly 100% HP', () => {
    const { container } = render(<HPBar current={80} max={80} />);
    const fill = container.querySelector('.hp-bar-fill') as HTMLElement;
    expect(fill).toHaveClass('hp-bar-fill--high');
  });
});
