import './GoldDisplay.css';

interface Props {
  amount: number;
}

export function GoldDisplay({ amount }: Props) {
  const formatted = amount.toLocaleString('en-US');
  return (
    <div className="gold-display" data-testid="gold-display">
      <span className="gold-icon" data-testid="gold-icon">🪙</span>
      <span className="gold-amount">{formatted}</span>
    </div>
  );
}
