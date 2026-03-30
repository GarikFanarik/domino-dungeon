import './DominoStone.css';

interface Stone {
  id: string;
  leftPip: number;
  rightPip: number;
  element: string | null;
}

interface Props {
  stone: Stone;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  disabled?: boolean;
  selected?: boolean;
  placed?: boolean;
  horizontal?: boolean;
}

// Standard domino pip positions in a 3×3 grid (index 0–8, row by row)
const PIP_MAP: Record<number, boolean[]> = {
  0: [false,false,false, false,false,false, false,false,false],
  1: [false,false,false, false,true, false, false,false,false],
  2: [false,false,true,  false,false,false, true, false,false],
  3: [false,false,true,  false,true, false, true, false,false],
  4: [true, false,true,  false,false,false, true, false,true ],
  5: [true, false,true,  false,true, false, true, false,true ],
  6: [true, false,true,  true, false,true,  true, false,true ],
};

const ELEMENT_ICONS: Record<string, string> = {
  fire:      '/assets/elements/fire/flamer.png',
  ice:       '/assets/elements/ice/snowflake-2.png',
  lightning: '/assets/elements/lightning/focused-lightning.png',
  poison:    '/assets/elements/poison/skull-with-syringe.png',
  earth:     '/assets/elements/earth/rock.png',
};

function PipGrid({ count }: { count: number }) {
  const pips = PIP_MAP[Math.min(count, 6)] ?? PIP_MAP[0];
  return (
    <div className="domino-half">
      {pips.map((active, i) => (
        <div key={i} className={active ? 'pip' : 'pip-empty'} />
      ))}
    </div>
  );
}

export function DominoStone({ stone, onClick, onDoubleClick, onPointerDown, disabled, selected, placed, horizontal }: Props) {
  const el = stone.element?.toLowerCase() ?? null;
  const classes = [
    'domino-tile',
    selected    ? 'domino-tile--selected'    : '',
    disabled    ? 'domino-tile--disabled'    : '',
    placed      ? 'domino-tile--placed'      : '',
    horizontal  ? 'domino-tile--horizontal'  : '',
    el          ? `domino-tile--${el}`       : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      onClick={!disabled ? onClick : undefined}
      onDoubleClick={!disabled ? onDoubleClick : undefined}
      onPointerDown={!disabled ? onPointerDown : undefined}
      data-testid="domino-stone"
      title={el ? `${el} stone (${stone.leftPip}|${stone.rightPip})` : `Stone (${stone.leftPip}|${stone.rightPip})`}
    >
      <span className="domino-sr-label">{stone.leftPip}|{stone.rightPip}</span>
      <PipGrid count={stone.leftPip} />
      <div className="domino-divider" />
      <PipGrid count={stone.rightPip} />
      {el && ELEMENT_ICONS[el] && (
        <img
          className="domino-element-badge"
          src={ELEMENT_ICONS[el]}
          alt={el}
        />
      )}
    </div>
  );
}
