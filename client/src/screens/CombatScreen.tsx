import { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { DominoStone } from '../components/DominoStone';
import { DominoBoard } from '../components/DominoBoard';
import { EnemyHand } from '../components/EnemyHand';
import type { BoardJSON, BoardTile } from '../../../src/game/board';
import './CombatScreen.css';

interface Stone {
  id: string;
  leftPip: number;
  rightPip: number;
  element: string | null;
}

interface EnemyStatus {
  burn: number;
  slow: number;
  frozen: boolean;
  stunned: boolean;
  poison: number;
}

interface Enemy {
  id?: string;
  name: string;
  hp: { current: number; max: number };
  status: EnemyStatus;
}

interface PlayerState {
  hp: { current: number; max: number };
  gold: number;
  armor: number;
  relics?: string[];
}

interface CombatState {
  enemy: Enemy;
  playerHand: Stone[];
  board: BoardJSON;
  enemyHand: Stone[];
  playerState: PlayerState;
  turnNumber: number;
  phase: 'player-turn' | 'enemy-turn' | 'resolving';
  swapsUsed: number;
  swapsPerTurn: number;
  bag: Stone[];
  act: number;
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

function damageStyle(dmg: number, type: 'player' | 'enemy'): { color: string; textShadow: string } {
  if (type === 'enemy') {
    // Enemy damage — always threatening red/purple
    const intensity = Math.min(dmg / 30, 1);
    const r = Math.round(200 + 55 * intensity);
    const g = Math.round(30 - 20 * intensity);
    const b = Math.round(120 - 80 * intensity);
    return {
      color: `rgb(${r},${g},${b})`,
      textShadow: `0 0 24px rgba(${r},${g},${b},0.8), 0 0 48px rgba(180,0,80,${0.4 + 0.4 * intensity})`,
    };
  }
  // Player damage — silver → gold → orange → crimson
  if (dmg <= 5)  return { color: '#d8d8f0', textShadow: '0 0 20px rgba(180,180,255,0.5)' };
  if (dmg <= 12) return { color: '#ffe14d', textShadow: '0 0 28px rgba(255,210,0,0.75)' };
  if (dmg <= 22) return { color: '#ff8c00', textShadow: '0 0 32px rgba(255,120,0,0.85), 0 0 10px rgba(255,60,0,0.5)' };
  return { color: '#ff2211', textShadow: '0 0 36px rgba(255,40,0,0.95), 0 0 14px rgba(255,80,0,0.7), 0 0 4px #fff' };
}

function getEnemySprite(enemy: Enemy): string {
  const n = enemy.name.toLowerCase();
  if (n.includes('abyssal crystal'))  return '/assets/combat/enemies/act2/Abysal-Crystal.png';
  if (n.includes('abyssal warrior'))  return '/assets/combat/enemies/act2/Abysal-Warrior.png';
  if (n.includes('abyssal lord'))     return '/assets/combat/enemies/act2/Abysal-Lord.png';
  if (n.includes('rat')  || n.includes('tomb'))      return '/assets/combat/enemies/act1/tomb-rat/tomb-rat.png';
  if (n.includes('crypt') || n.includes('sentinel')) return '/assets/combat/enemies/act1/crypt-sentinel/crypt-sentinel.png';
  return '/assets/combat/enemies/act1/stonewarden/stonewarden.png';
}

function canStonePlay(stone: Stone, board: BoardJSON): { left: boolean; right: boolean } {
  if (!board || board.tiles.length === 0) return { left: true, right: true };
  const left = board.leftOpen !== null &&
    (stone.leftPip === board.leftOpen || stone.rightPip === board.leftOpen);
  const right = board.rightOpen !== null &&
    (stone.leftPip === board.rightOpen || stone.rightPip === board.rightOpen);
  return { left, right };
}

/** Returns which board side to play on given the tile's current visual orientation.
 *  The LEFT face of the tile connects to the RIGHT board end (tiles extend outward).
 *  The RIGHT face of the tile connects to the LEFT board end.
 *  Returns null if neither orientation matches. */
function getPlaySide(stone: Stone, flipped: boolean, board: BoardJSON): 'left' | 'right' | null {
  if (!board || board.tiles.length === 0) return 'right';
  const leftDisplay  = flipped ? stone.rightPip : stone.leftPip;
  const rightDisplay = flipped ? stone.leftPip  : stone.rightPip;
  if (board.rightOpen !== null && leftDisplay  === board.rightOpen) return 'right';
  if (board.leftOpen  !== null && rightDisplay === board.leftOpen)  return 'left';
  return null;
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
  const { navigate, flashRelics } = useGame();
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [enemyHit, setEnemyHit] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const [swapMode, setSwapMode] = useState(false);
  const [showBag, setShowBag] = useState(false);
  const [stoneRewards, setStoneRewards] = useState<StoneReward[]>([]);
  const [relicReward, setRelicReward] = useState(false);
  const [previewDamage, setPreviewDamage] = useState<number | null>(null);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [flippedStoneIds, setFlippedStoneIds] = useState<Set<string>>(new Set());
  const [prevBoardTiles, setPrevBoardTiles] = useState<BoardTile[] | null>(null);
  const [enemyDamageDisplay, setEnemyDamageDisplay] = useState<number | null>(null);
  const [turnBanner, setTurnBanner] = useState<'player' | 'enemy' | null>(null);
  /** HP to show during the board animation — freezes at the pre-damage value until onAnimationDone. */
  const [displayedPlayerHP, setDisplayedPlayerHP] = useState<PlayerState['hp'] | null>(null);

  const combatRef = useRef<CombatState | null>(null);
  const damageTimerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pendingEnemyHandRef = useRef<Stone[] | null>(null);

  useEffect(() => { combatRef.current = combat; }, [combat]);

  // Clear damage counter timers on unmount
  useEffect(() => () => { damageTimerRef.current.forEach(clearTimeout); }, []);

  // R key: flip selected tile orientation; Escape: deselect
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setSelectedTile(null); return; }
      if ((e.key === 'r' || e.key === 'R') && selectedTile !== null) {
        const stone = combatRef.current?.playerHand[selectedTile];
        if (!stone) return;
        setFlippedStoneIds(prev => {
          const next = new Set(prev);
          if (next.has(stone.id)) next.delete(stone.id); else next.add(stone.id);
          return next;
        });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedTile]);

  useEffect(() => {
    fetch(`/api/run/${runId}/combat`)
      .then(r => r.json())
      .then((data) => setCombat({
        ...data,
        swapsUsed: data.swapsUsed ?? 0,
        swapsPerTurn: data.swapsPerTurn ?? 1,
        bag: data.bag ?? [],
      }))
      .catch(() => setMessage('Failed to load combat'));
  }, [runId]);


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

  async function playStone(index: number, side: 'left' | 'right') {
    setLoading(true);
    try {
      const res = await fetch(`/api/run/${runId}/combat/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stoneIndex: index, side }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || 'Invalid move'); return; }
      setCombat(prev => prev ? { ...prev, board: data.board, playerHand: data.hand } : prev);
      setPreviewDamage(data.previewDamage ?? null);
    } catch {
      setMessage('Network error');
    } finally {
      setLoading(false);
    }
  }

  function handleTileClick(index: number, stone: Stone) {
    if (!combat || combat.phase !== 'player-turn') return;
    if (swapMode) { handleSwapStone(index); return; }
    setSelectedTile(prev => (prev === index ? null : index));
    // suppress unused warning
    void stone;
  }

  function handleBoardEndClick(side: 'left' | 'right') {
    if (selectedTile === null || !combat) return;
    const stone = combat.playerHand[selectedTile];
    if (!stone) return;
    const index = selectedTile;
    setSelectedTile(null);
    playStone(index, side);
  }

  async function handleEndTurn() {
    if (!combat || combat.phase !== 'player-turn') return;
    const prevTiles = combat.board.orderedTiles;
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
        if (data.triggeredRelics?.length > 0) flashRelics(data.triggeredRelics);
        if (data.goldEarned > 0) setMessage(`Victory! +${data.goldEarned}g`);
        setRelicReward(!!data.relicReward);
        if (data.stoneRewards && data.stoneRewards.length > 0) {
          setStoneRewards(data.stoneRewards);
        } else {
          const dest = data.relicReward ? 'relic-selection' : 'dungeon-map';
          setTimeout(() => navigate(dest), data.goldEarned > 0 ? 1200 : 0);
        }
      } else if (data.combatResult === 'player-died') {
        navigate('run-summary');
      } else {
        setEnemyHit(true);
        setTimeout(() => setEnemyHit(false), 450);
        // Show "Enemy Turn" banner, dismiss after 1.8s
        setTurnBanner('enemy');
        setTimeout(() => setTurnBanner(null), 1800);
        // Freeze HP bar at current (pre-damage) value — it will unfreeze in onAnimationDone.
        setDisplayedPlayerHP(combat.playerState.hp);
        // Update full combat state immediately (playerState now has new HP in state,
        // but we show displayedPlayerHP until the animation finishes).
        setCombat(prev => prev ? {
          ...prev,
          playerState: data.playerState,
          enemy: data.enemy,
          board: data.board ?? prev.board,
          swapsUsed: 0,
          playerHand: data.hand ?? prev.playerHand,
        } : prev);
        if (data.enemyHand) pendingEnemyHandRef.current = data.enemyHand;
        // Progressive damage counter — same timing as DominoBoard tile reveal.
        // Use per-tile raw contributions to show accurate incremental damage.
        const totalDamage = data.enemyAttack?.damage ?? 0;
        const perTile: number[] = data.enemyAttack?.perTileDamage ?? [];
        const numEnemyTiles = perTile.length || (data.enemyAttack?.stonesPlayed?.length ?? 0);
        damageTimerRef.current.forEach(clearTimeout);
        damageTimerRef.current = [];
        if (numEnemyTiles > 0 && totalDamage > 0) {
          const totalRaw = perTile.reduce((s, d) => s + d, 0) || numEnemyTiles;
          let cumRaw = 0;
          for (let i = 0; i < numEnemyTiles; i++) {
            cumRaw += perTile[i] ?? (totalRaw / numEnemyTiles);
            const isLast = i === numEnemyTiles - 1;
            const display = isLast ? totalDamage : Math.round(totalDamage * cumRaw / totalRaw);
            const t = setTimeout(() => {
              setEnemyDamageDisplay(display);
            }, 3000 + i * 1200);
            damageTimerRef.current.push(t);
          }
        }
        setPrevBoardTiles(prevTiles);
        setPreviewDamage(null);
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
    navigate(relicReward ? 'relic-selection' : 'dungeon-map');
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
  const swapsLeft = combat.swapsPerTurn - combat.swapsUsed;

  const bgImage = `/assets/combat/background/arena-act${combat.act}.jpg`;

  const dragValidEnds = selectedTile !== null
    ? canStonePlay(combat.playerHand[selectedTile], combat.board)
    : undefined;

  return (
    <div
      className="combat-screen"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Stone reward overlay */}
      {stoneRewards.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
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

      {/* ── Enemy hand (top center) ── */}
      <div className="combat-enemy-hand-zone">
        <EnemyHand tiles={combat.enemyHand} />
      </div>

      {/* ── Main area: board (centered) + enemy box (absolute right) ── */}
      <div className="combat-main">
        <div className="combat-board-zone">
          <DominoBoard
            board={combat.board}
            isPlayerTurn={isPlayerTurn}
            dragValidEnds={dragValidEnds}
            onEndClick={handleBoardEndClick}
            prevOrderedTiles={prevBoardTiles ?? undefined}
            onAnimationDone={() => {
              setPrevBoardTiles(null);
              setEnemyDamageDisplay(null);
              damageTimerRef.current.forEach(clearTimeout);
              damageTimerRef.current = [];
              if (displayedPlayerHP) {
                const hpDropped = displayedPlayerHP.current > combat.playerState.hp.current;
                setDisplayedPlayerHP(null);
                if (hpDropped) {
                  setPlayerHit(true);
                  setTimeout(() => setPlayerHit(false), 450);
                }
              }
              // Apply enemy hand update now that animations are done
              if (pendingEnemyHandRef.current) {
                const newHand = pendingEnemyHandRef.current;
                pendingEnemyHandRef.current = null;
                setCombat(prev => prev ? { ...prev, enemyHand: newHand } : prev);
              }
              // Show "Your Turn" banner after enemy sequence ends
              setTurnBanner('player');
              setTimeout(() => setTurnBanner(null), 1800);
            }}
          />
        </div>
        <div className="combat-enemy-zone">
          <div className="combat-entity-box">
            <div className="hud-name">{combat.enemy.name}</div>
            <div className="hud-hp-track">
              <div
                className="hud-hp-fill"
                style={{ width: `${Math.max(0, (combat.enemy.hp.current / combat.enemy.hp.max) * 100)}%` }}
              />
            </div>
            <div className="hud-hp-label">{combat.enemy.hp.current} / {combat.enemy.hp.max} HP</div>
            <StatusBadges status={combat.enemy.status} />
            <div className="sprite-wrapper">
              <img
                className={`enemy-sprite${enemyHit ? ' enemy-sprite--hit' : ''}`}
                src={getEnemySprite(combat.enemy)}
                alt={combat.enemy.name}
              />
              {enemyHit && (
                <div className="slash-overlay slash-overlay--player">
                  <span /><span /><span />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom: hero + hand ── */}
      <div className="combat-bottom">
        <div className="combat-player-zone">
          <div className="sprite-wrapper">
            <img
            className={`hero-sprite${playerHit ? ' hero-sprite--hit' : ''}`}
            src="/assets/combat/hero/hero.png"
            alt="Hero"
          />
            {playerHit && (
              <div className="slash-overlay slash-overlay--enemy">
                <span /><span /><span />
              </div>
            )}
          </div>
          <div className="hud-hp-track hud-hp-track--player">
            <div
              className="hud-hp-fill"
              style={{ width: `${Math.max(0, ((displayedPlayerHP ?? combat.playerState.hp).current / (displayedPlayerHP ?? combat.playerState.hp).max) * 100)}%` }}
            />
          </div>
          <div className="hud-hp-label">{(displayedPlayerHP ?? combat.playerState.hp).current} / {(displayedPlayerHP ?? combat.playerState.hp).max} HP</div>
        </div>

        <div className="combat-hand-tiles">
          {combat.playerHand.map((stone, i) => {
            const { left, right } = canStonePlay(stone, combat.board);
            const playable = isPlayerTurn && (left || right);
            const isFlipped = flippedStoneIds.has(stone.id);
            const displayStone = isFlipped
              ? { ...stone, leftPip: stone.rightPip, rightPip: stone.leftPip }
              : stone;
            return (
              <div key={stone.id}>
                <DominoStone
                  stone={displayStone}
                  horizontal
                  onClick={() => handleTileClick(i, stone)}
                  disabled={!isPlayerTurn || (!swapMode && !playable)}
                  selected={swapMode || selectedTile === i}
                />
              </div>
            );
          })}
        </div>

        <div className="combat-actions-end">
          <div className="combat-hand-controls">
            {isPlayerTurn && swapsLeft > 0 && (
              <button
                className={`btn-swap${swapMode ? ' btn-swap--active' : ''}`}
                onClick={() => setSwapMode(s => !s)}
              >
                {swapMode ? 'Cancel' : `Swap (${swapsLeft})`}
              </button>
            )}
            <button className="btn-swap" onClick={() => setShowBag(s => !s)}>
              Bag ({combat.bag?.length ?? 0})
            </button>
          </div>
          {message && <span className="combat-message">{message}</span>}
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

      {/* Bag viewer */}
      {showBag && (
        <div className="bag-viewer">
          <div className="bag-viewer-label">Bag contents ({combat.bag.length} stones)</div>
          <div className="bag-viewer-tiles">
            {combat.bag.length === 0
              ? <span className="combat-chain-empty">Bag is empty</span>
              : combat.bag.map((stone, i) => (
                  <DominoStone key={`bag-${stone.id}-${i}`} stone={stone} horizontal disabled />
                ))
            }
          </div>
        </div>
      )}

      {/* ── Damage counters ── */}
      {previewDamage !== null && previewDamage > 0 && (
        <div
          key={previewDamage}
          className="damage-counter"
          style={damageStyle(previewDamage, 'player')}
        >
          {previewDamage}
        </div>
      )}
      {enemyDamageDisplay !== null && enemyDamageDisplay > 0 && (
        <div
          key={`enemy-${enemyDamageDisplay}`}
          className="damage-counter damage-counter--enemy"
          style={damageStyle(enemyDamageDisplay, 'enemy')}
        >
          -{enemyDamageDisplay}
        </div>
      )}

      {/* ── Turn banner ── */}
      {turnBanner && (
        <div key={turnBanner} className={`turn-banner turn-banner--${turnBanner}`}>
          {turnBanner === 'player' ? 'Your Turn' : 'Enemy Turn'}
        </div>
      )}


    </div>
  );
}
