import './EnemyHand.css';

interface Props {
  count: number;
}

export function EnemyHand({ count }: Props) {
  return (
    <div className="enemy-hand">
      <div className="enemy-hand-label">Enemy Hand <span className="enemy-hand-count">{count}</span></div>
      <div className="enemy-hand-tiles">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="enemy-hand-tile" aria-label="hidden enemy tile">
            <div className="enemy-hand-tile-half" />
            <div className="enemy-hand-tile-divider" />
            <div className="enemy-hand-tile-half" />
          </div>
        ))}
      </div>
    </div>
  );
}
