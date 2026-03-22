interface Props {
  current: number;
  max: number;
  showNumbers?: boolean;
}

export function HPBar({ current, max, showNumbers = true }: Props) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const colorClass = pct > 60 ? 'hp-bar-fill--high' : pct >= 30 ? 'hp-bar-fill--mid' : 'hp-bar-fill--low';
  return (
    <div>
      {showNumbers && <span>{current}/{max} HP</span>}
      <div className="hp-bar">
        <div className={`hp-bar-fill ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
