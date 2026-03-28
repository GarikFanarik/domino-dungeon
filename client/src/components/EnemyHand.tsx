import { DominoStone } from './DominoStone';
import './EnemyHand.css';

interface Stone {
  id: string;
  leftPip: number;
  rightPip: number;
  element: string | null;
}

interface Props {
  tiles: Stone[];
}

export function EnemyHand({ tiles }: Props) {
  if (tiles.length === 0) return null;
  return (
    <div className="enemy-hand">
      <div className="enemy-hand-label">Enemy Hand <span className="enemy-hand-count">{tiles.length}</span></div>
      <div className="enemy-hand-tiles">
        {tiles.map((stone) => (
          <DominoStone key={stone.id} stone={stone} horizontal disabled />
        ))}
      </div>
    </div>
  );
}
