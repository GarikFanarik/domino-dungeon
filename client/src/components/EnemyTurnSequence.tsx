import { useEffect } from 'react';
import './EnemyTurnSequence.css';

interface Props {
  enemyName: string;
  attack?: {
    stonesPlayed: { leftPip: number; rightPip: number }[];
    rawDamage: number;
    armorBlocked: number;
    damage: number;
  };
  skipReason?: 'stunned' | 'frozen';
  dotDamage: { burn: number; poison: number };
  onDone: () => void;
}

function hide(visible: boolean): React.CSSProperties {
  return visible ? {} : { visibility: 'hidden' };
}

export function EnemyTurnSequence({ enemyName, attack, skipReason, dotDamage, onDone }: Props) {
  const hasDot = dotDamage.burn > 0 || dotDamage.poison > 0;
  const duration = attack ? 2500 : hasDot ? 2200 : 1200;

  useEffect(() => {
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Slot 1: stone step (if attack) OR skip banner (if skipReason)
  const slot1Visible = !!(attack || skipReason);
  const slot2Visible = !!(attack && attack.armorBlocked > 0);
  const slot3Visible = !!(attack && attack.damage > 0);
  const slot4Visible = dotDamage.burn > 0;
  const slot5Visible = dotDamage.poison > 0;

  return (
    <div className="enemy-turn-sequence">
      {/* Slot 1 */}
      <div className="seq-step" style={hide(slot1Visible)}>
        {attack ? (
          <>
            <div className="seq-icon">💀</div>
            <div className="seq-text">
              {enemyName} plays
              {attack.stonesPlayed.map((s, i) => (
                <span key={i} className="seq-domino">
                  <span className="seq-domino__pip">{s.leftPip}</span>
                  <span className="seq-domino__div" />
                  <span className="seq-domino__pip">{s.rightPip}</span>
                </span>
              ))}
            </div>
            <div className="seq-val seq-val--base">{attack.rawDamage} dmg</div>
          </>
        ) : skipReason ? (
          <>
            <div className="seq-icon">{skipReason === 'stunned' ? '⚡' : '❄️'}</div>
            <div className="seq-text">
              <b>{enemyName} is {skipReason}!</b>
              <span>Skips their attack this turn.</span>
            </div>
          </>
        ) : null}
      </div>

      {/* Slot 2: armor */}
      <div className="seq-step" style={hide(slot2Visible)}>
        <div className="seq-icon">🛡</div>
        <div className="seq-text">Your armor absorbs</div>
        <div className="seq-val seq-val--block">{attack ? `−${attack.armorBlocked} blocked` : ''}</div>
      </div>

      {/* Slot 3: HP taken */}
      <div className="seq-step" style={hide(slot3Visible)}>
        <div className="seq-icon">❤️</div>
        <div className="seq-text"><b>You take</b></div>
        <div className="seq-val seq-val--net">{attack ? `−${attack.damage} HP` : ''}</div>
      </div>

      {/* Slot 4: burn DOT */}
      <div className="seq-step" style={hide(slot4Visible)}>
        <div className="seq-icon">🔥</div>
        <div className="seq-text">Your burn deals {dotDamage.burn} to {enemyName}</div>
        <div className="seq-val seq-val--dot">−{dotDamage.burn} HP</div>
      </div>

      {/* Slot 5: poison DOT */}
      <div className="seq-step" style={hide(slot5Visible)}>
        <div className="seq-icon">☠️</div>
        <div className="seq-text">Your poison deals {dotDamage.poison} to {enemyName}</div>
        <div className="seq-val seq-val--dot">−{dotDamage.poison} HP</div>
      </div>
    </div>
  );
}
