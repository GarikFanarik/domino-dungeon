import { render, screen } from '@testing-library/react';
import { EnemyHand } from '../EnemyHand';

describe('EnemyHand', () => {
  it('shows the correct count', () => {
    render(<EnemyHand count={4} />);
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders face-down tiles (no pip values in DOM)', () => {
    render(<EnemyHand count={3} />);
    expect(screen.queryByTestId('pip-value')).not.toBeInTheDocument();
  });

  it('renders zero tiles gracefully', () => {
    render(<EnemyHand count={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
