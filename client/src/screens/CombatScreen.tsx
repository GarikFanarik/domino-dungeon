import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { DominoStone } from '../components/DominoStone';
import './CombatScreen.css';

interface Stone {
  id: string;
  leftPip: number;
  rightPip: number;
  element: string | null;
}

interface PlacedStone {
  stone: Stone;
  side: 'left' | 'right';
  flipped: boolean;
}

interface EnemyStatus {
  burn: number;
  slow: number;
  frozen: boolean;
  stunned: boolean;
  poison: number;
}

interface Enemy {
  name: string;
  hp: { current: number; max: number };
  status: EnemyStatus;
}

interface PlayerState {
  hp: { current: number; max: number };
  gold: number;
  armor: number;
}

interface CombatState {
  enemy: Enemy;
  playerHand: Stone[];
  chain: PlacedStone[];
  playerState: PlayerState;
  turnNumber: number;
  phase: 'player-turn' | 'enemy-turn' | 'resolving';
  swapsUsed: number;
  swapsPerTurn: number;
  leftOpen: number | null;
  rightOpen: number | null;
  bag: Stone[];
}

interface StoneReward {
  element: string;
  leftPip: number;
  rightPip: number;
}

interface Props { runId: string; }

const ELEMENT_ICONS: Record<string, string> = {
  fire:      '/assets/elements/fire/flamer.png',
  ice:       '/assets/elements/ice/snowflake-2.png',
  lightning: '/assets/elements/lightning/focused-lightning.png',
  poison:    '/assets/elements/poison/skull-with-syringe.png',
  earth:     '/assets/elements/earth/rock.png',
};

function getEnemySprite(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('rat')  || n.includes('tomb'))    return '/assets/combat/enemies/act1/tomb-rat/tomb-rat.png';
  if (n.includes('crypt') || n.includes('sentinel')) return '/assets/combat/enemies/act1/crypt-sentinel/crypt-sentinel.png';
  return '/assets/combat/enemies/act1/stonewarden/stonewarden.png';
}

function calcChainDamage(chain: PlacedStone[]): number {
  return chain.slice(1).reduce((sum, placed) => {
    const junction = placed.flipped ? placed.stone.rightPip : placed.stone.leftPip;
    return sum + junction * 2;
  }, 0);
}

function canStoneBePlayed(stone: Stone, chain: PlacedStone[], rightOpen: number | null): boolean {
  if (chain.length === 0) return true;
  return stone.leftPip === rightOpen || stone.rightPip === rightOpen;
}

function computeRightOpen(chain: PlacedStone[]): number | null {
  if (chain.length === 0) return null;
  const last = chain[chain.length - 1];
  return last.flipped ? last.stone.leftPip : last.stone.rightPip;
}

function StatusBadges({ status }: { status: EnemyStatus }) {
  const badges: { key: string; label: string; value: string; cls: string }[] = [];
  if (status.burn   > 0) badges.push({ key: 'burn',   label: 'fire',      value: `🔥 ${status.burn}`,   cls: 'status-badge--burn' });
  if (status.poison > 0) badges.push({ key: 'poison', label: 'poison',    value: `☠ ${status.poison}`,  cls: 'status-badge--poison' });
  if (status.slow   > 0) badges.push({ key: 'slow',   label: 'ice',       value: `❄ ${status.slow}`,    cls: 'status-badge--slow' });
  if (status.frozen)     badges.push({ key: 'frozen', label: 'ice',       value: '❄ FROZEN',             cls: 'status-badge--freeze' });
  if (status.stunned)    badges.push({ key: 'stunned',label: 'lightning', value: '⚡ STUNNED',           cls: 'status-badge--stun' });
  if (badges.length === 0) return null;
  return (
    <div className="hud-status">
      {badges.map(b => (
        <span key={b.key} className={`status-badge ${b.cls}`}>
          {ELEMENT_ICONS[b.label] && <img src={ELEMENT_ICONS[b.label]} alt={b.label} />}
          {b.value}
        </span>
      ))}
    </div>
  );
}

export function CombatScreen({ runId }: Props) {
  const { navigate } = useGame();
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [enemyHit, setEnemyHit] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const [swapMode, setSwapMode] = useState(false);
  const [showBag, setShowBag] = useState(false);
  const [stoneRewards, setStoneRewards] = useState<StoneReward[]>([]);

  useEffect(() => {
    fetch(`/api/run/${runId}/combat`)
      .then(r => r.json())
      .then((data) => setCombat({
        ...data,
        swapsUsed: data.swapsUsed ?? 0,
        swapsPerTurn: data.swapsPerTurn ?? 1,
        leftOpen: data.leftOpen ?? null,
        rightOpen: data.rightOpen ?? null,
        bag: data.bag ?? [],
      }))
      .catch(() => setMessage('Failed to load combat'));
  }, [runId]);

  async function handleStoneClick(index: number) {
    if (swapMode) {
      await handleSwapStone(index);
    } else {
      await handlePlayStone(index);
    }
  }

  async function handleSwapStone(index: number) {
    if (!combat || combat.phase !== 'player-turn') return;
    setSwapMode(false);
    setMessage('');
    try {
      const res = await fetch(`/api/run/${runId}/combat/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stoneIndex: index }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || 'Swap failed'); return; }
      setCombat(prev => prev ? { ...prev, playerHand: data.hand, swapsUsed: prev.swapsUsed + 1 } : prev);
    } catch {
      setMessage('Network error');
    }
  }

  async function handlePlayStone(index: number) {
    if (!combat || combat.phase !== 'player-turn') return;
    setMessage('');

    const stone = combat.playerHand[index];
    const flipped = combat.chain.length > 0 && stone.rightPip === combat.rightOpen;
    const newPlaced: PlacedStone = { stone, side: 'right', flipped };
    const newChain = [...combat.chain, newPlaced];
    const newHand = combat.playerHand.filter((_, i) => i !== index);
    const newRightOpen = computeRightOpen(newChain);

    // Optimistic update — instant UI response
    setCombat(prev => prev ? { ...prev, chain: newChain, playerHand: newHand, rightOpen: newRightOpen } : prev);

    try {
      const res = await fetch(`/api/run/${runId}/combat/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stoneIndex: index }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Roll back
        setCombat(prev => prev ? { ...prev, chain: combat.chain, playerHand: combat.playerHand, rightOpen: combat.rightOpen } : prev);
        setMessage(data.error || 'Invalid move');
      }
    } catch {
      setCombat(prev => prev ? { ...prev, chain: combat.chain, playerHand: combat.playerHand, rightOpen: combat.rightOpen } : prev);
      setMessage('Network error');
    }
  }

  async function handleUnplayStone(chainIndex: number) {
    if (!combat || combat.phase !== 'player-turn') return;
    setMessage('');

    const removedStones = combat.chain.slice(chainIndex).map(p => p.stone);
    const newChain = combat.chain.slice(0, chainIndex);
    const newHand = [...combat.playerHand, ...removedStones];
    const newRightOpen = computeRightOpen(newChain);

    // Optimistic update — instant UI response
    setCombat(prev => prev ? { ...prev, chain: newChain, playerHand: newHand, rightOpen: newRightOpen } : prev);

    try {
      const res = await fetch(`/api/run/${runId}/combat/unplay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainIndex }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Roll back
        setCombat(prev => prev ? { ...prev, chain: combat.chain, playerHand: combat.playerHand, rightOpen: combat.rightOpen } : prev);
        setMessage(data.error || 'Cannot remove stone');
      }
    } catch {
      setCombat(prev => prev ? { ...prev, chain: combat.chain, playerHand: combat.playerHand, rightOpen: combat.rightOpen } : prev);
      setMessage('Network error');
    }
  }

  async function handleEndTurn() {
    if (!combat || combat.phase !== 'player-turn') return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/run/${runId}/combat/end-turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (data.combatResult === 'player-won') {
        if (data.goldEarned > 0) setMessage(`Victory! +${data.goldEarned}g`);
        if (data.stoneRewards && data.stoneRewards.length > 0) {
          setStoneRewards(data.stoneRewards);
        } else {
          setTimeout(() => navigate('relic-selection'), data.goldEarned > 0 ? 1200 : 0);
        }
      } else if (data.combatResult === 'player-died') {
        navigate('run-summary');
      } else {
        if (data.enemyAttack?.damage > 0) {
          setPlayerHit(true);
          setTimeout(() => setPlayerHit(false), 450);
        }
        setEnemyHit(true);
        setTimeout(() => setEnemyHit(false), 450);
        setCombat(prev => prev ? {
          ...prev,
          playerState: data.playerState,
          enemy: data.enemy,
          chain: [],
          swapsUsed: 0,
          playerHand: data.hand ?? prev.playerHand,
          leftOpen: null,
          rightOpen: null,
        } : prev);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimStone(reward: StoneReward) {
    await fetch(`/api/run/${runId}/combat/claim-stone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ element: reward.element }),
    });
    setStoneRewards([]);
    navigate('relic-selection');
  }

  const STONE_REWARD_COLORS: Record<string, string> = {
    fire: 'rgba(255, 80, 20, 0.85)',
    ice: 'rgba(50, 180, 255, 0.85)',
    lightning: 'rgba(255, 200, 0, 0.85)',
    poison: 'rgba(80, 200, 50, 0.85)',
    earth: 'rgba(160, 120, 60, 0.85)',
  };

  if (!combat) return <div className="combat-loading">Entering the dungeon…</div>;

  const isPlayerTurn = combat.phase === 'player-turn';
  const enemyHpPct = Math.max(0, (combat.enemy.hp.current / combat.enemy.hp.max) * 100);
  const playerHpPct = Math.max(0, (combat.playerState.hp.current / combat.playerState.hp.max) * 100);
  const chainDamage = calcChainDamage(combat.chain);
  const swapsLeft = combat.swapsPerTurn - combat.swapsUsed;

  return (
    <div className="combat-screen">
      {stoneRewards.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <h2 style={{ color: '#e8d8b0', marginBottom: '1.5rem', fontSize: '1.5rem' }}>Choose a Stone Reward</h2>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {stoneRewards.map((reward, i) => (
              <button
                key={i}
                onClick={() => handleClaimStone(reward)}
                style={{ background: STONE_REWARD_COLORS[reward.element] ?? 'rgba(100,100,100,0.85)', border: '2px solid rgba(255,255,255,0.4)', borderRadius: '12px', padding: '1.5rem 2rem', cursor: 'pointer', color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', minWidth: '120px', textAlign: 'center' }}
              >
                <div style={{ textTransform: 'capitalize', marginBottom: '0.5rem' }}>{reward.element}</div>
                <div style={{ fontSize: '1.3rem' }}>{reward.leftPip} | {reward.rightPip}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="combat-bg" />

      <div className="combat-content">
        {/* Phase banner */}
        <div className={`combat-phase ${isPlayerTurn ? 'combat-phase--player' : 'combat-phase--enemy'}`}>
          {isPlayerTurn ? 'Your Turn' : 'Enemy Turn'}
        </div>

        {/* HUD */}
        <div className="combat-hud">
          {/* Enemy panel */}
          <div className="hud-panel">
            <div className="hud-name">{combat.enemy.name}</div>
            <div className="hud-hp-track">
              <div className="hud-hp-fill" style={{ width: `${enemyHpPct}%` }} />
            </div>
            <div className="hud-hp-label">{combat.enemy.hp.current} / {combat.enemy.hp.max} HP</div>
            <StatusBadges status={combat.enemy.status} />
          </div>

          {/* Player panel */}
          <div className="hud-panel">
            <div className="hud-name">You</div>
            <div className="hud-hp-track">
              <div className="hud-hp-fill" style={{ width: `${playerHpPct}%` }} />
            </div>
            <div className="hud-hp-label">{combat.playerState.hp.current} / {combat.playerState.hp.max} HP</div>
            <div className="hud-stats">
              {combat.playerState.armor > 0 && (
                <span className="hud-stat">🛡 <span className="hud-stat-val">{combat.playerState.armor}</span></span>
              )}
              <span className="hud-stat">💰 <span className="hud-stat-val">{combat.playerState.gold}g</span></span>
              <span className="hud-stat">🔄 <span className="hud-stat-val">{swapsLeft}</span> swap</span>
            </div>
          </div>
        </div>

        {/* Battlefield */}
        <div className="combat-battlefield">
          <div className="sprite-container">
            <img
              className={`hero-sprite${playerHit ? ' hero-sprite--hit' : ''}`}
              src="/assets/combat/hero/hero.png"
              alt="Hero"
            />
          </div>
          <div className="sprite-container">
            <img
              className={`enemy-sprite${enemyHit ? ' enemy-sprite--hit' : ''}`}
              src={getEnemySprite(combat.enemy.name)}
              alt={combat.enemy.name}
            />
          </div>
        </div>

        {/* Chain */}
        <div className="combat-chain-wrap">
          <div className="combat-chain-label">
            Chain
            {chainDamage > 0 && (
              <span className="chain-damage-preview">{chainDamage} dmg</span>
            )}
          </div>
          <div className="combat-chain-tiles">
            {combat.chain.length === 0 ? (
              <span className="combat-chain-empty">Play stones to build a chain…</span>
            ) : (
              combat.chain.map((p, i) => {
                const displayStone = p.flipped
                  ? { ...p.stone, leftPip: p.stone.rightPip, rightPip: p.stone.leftPip }
                  : p.stone;
                return (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {i > 0 && <div className="chain-connector" />}
                    <DominoStone
                      stone={displayStone}
                      placed
                      horizontal
                      onClick={isPlayerTurn ? () => handleUnplayStone(i) : undefined}
                    />
                  </span>
                );
              })
            )}
          </div>
        </div>

        {/* Hand */}
        <div className="combat-hand-wrap">
          <div className="combat-hand-label">
            Your Hand
            <div className="hand-label-actions">
              {isPlayerTurn && swapsLeft > 0 && (
                <button
                  className={`btn-swap${swapMode ? ' btn-swap--active' : ''}`}
                  onClick={() => setSwapMode(s => !s)}
                >
                  {swapMode ? 'Cancel' : `Swap (${swapsLeft})`}
                </button>
              )}
              <button
                className={`btn-swap${showBag ? ' btn-swap--active' : ''}`}
                onClick={() => setShowBag(s => !s)}
              >
                Bag ({combat.bag.length})
              </button>
            </div>
          </div>
          <div className="combat-hand-tiles">
            {combat.playerHand.map((stone, i) => {
              const playable = isPlayerTurn && canStoneBePlayed(stone, combat.chain, combat.rightOpen);
              return (
                <DominoStone
                  key={stone.id}
                  stone={stone}
                  onClick={() => handleStoneClick(i)}
                  disabled={!isPlayerTurn || (!swapMode && !playable)}
                  selected={swapMode}
                />
              );
            })}
          </div>

          {/* Bag viewer */}
          {showBag && (
            <div className="bag-viewer">
              <div className="bag-viewer-label">Bag contents ({combat.bag.length} stones)</div>
              <div className="bag-viewer-tiles">
                {combat.bag.length === 0
                  ? <span className="combat-chain-empty">Bag is empty</span>
                  : combat.bag.map((stone, i) => (
                      <DominoStone key={`bag-${stone.id}-${i}`} stone={stone} disabled />
                    ))
                }
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="combat-actions">
          <span className="combat-message">{message}</span>
          <span className="combat-turn-info">Turn {combat.turnNumber}</span>
          <button
            className="btn-end-turn"
            onClick={handleEndTurn}
            disabled={!isPlayerTurn || loading}
            data-testid="end-turn-btn"
          >
            {loading ? 'Resolving…' : 'End Turn'}
          </button>
        </div>
      </div>
    </div>
  );
}
