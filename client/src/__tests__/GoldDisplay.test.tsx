import { render, screen } from '@testing-library/react';
import { GoldDisplay } from '../components/GoldDisplay';

describe('GoldDisplay', () => {
  it('renders the gold amount', () => {
    render(<GoldDisplay amount={45} />);
    expect(screen.getByText(/45/)).toBeInTheDocument();
  });

  it('formats large numbers with commas', () => {
    render(<GoldDisplay amount={1500} />);
    expect(screen.getByText(/1,500/)).toBeInTheDocument();
  });

  it('formats thousands correctly', () => {
    render(<GoldDisplay amount={8050} />);
    expect(screen.getByText(/8,050/)).toBeInTheDocument();
  });

  it('shows coin icon', () => {
    render(<GoldDisplay amount={45} />);
    expect(screen.getByTestId('gold-display')).toBeInTheDocument();
    expect(screen.getByTestId('gold-icon')).toBeInTheDocument();
  });

  it('shows zero gold correctly', () => {
    render(<GoldDisplay amount={0} />);
    expect(screen.getByText(/0/)).toBeInTheDocument();
  });
});
