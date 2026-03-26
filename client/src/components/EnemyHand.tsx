import './EnemyHand.css';

interface Props {
  count: number;
}

export function EnemyHand({ count }: Props) {
  return (
    <div className="enemy-hand">
      <div className="enemy-hand-tiles">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="enemy-hand-tile" aria-label="hidden enemy tile" />
        ))}
      </div>
      <div className="enemy-hand-count">{count}</div>
    </div>
  );
}
