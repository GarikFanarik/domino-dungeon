interface Props {
  current: number;
  max: number;
  showNumbers?: boolean;
}

export function HPBar({ current, max, showNumbers = true }: Props) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div>
      {showNumbers && <span>{current}/{max} HP</span>}
      <div className="hp-bar">
        <div className="hp-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
