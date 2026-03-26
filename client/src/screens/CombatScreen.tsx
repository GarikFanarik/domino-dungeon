import { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { DominoStone } from '../components/DominoStone';
import { DominoBoard } from '../components/DominoBoard';
import { EnemyHand } from '../components/EnemyHand';
import { EnemyTurnSequence } from '../components/EnemyTurnSequence';
import { relicImage } from '../utils/relicImage';
import type { BoardJSON } from '../../../src/game/board';
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
  enemyHandCount: number;
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

interface EnemyTurnData {
  enemyName: string;
  attack?: {
    stonesPlayed: { leftPip: number; rightPip: number }[];
    rawDamage: number;
    armorBlocked: number;
    damage: number;
  };
  skipReason?: 'stunned' | 'frozen';
  dotDamage: { burn: number; poison: number };
}

interface DragState {
  stoneIndex: number;
  stone: Stone;
  flipped: boolean;
  x: number;       // cursor x (viewport)
  y: number;       // cursor y (viewport)
  offsetX: number; // cursor offset from tile's left edge at grab time
  offsetY: number; // cursor offset from tile's top edge at grab time
  invalid: boolean;
}

interface Props { runId: string; }

const ELEMENT_ICONS: Record<string, string> = {
  fire:      '/assets/elements/fire/flamer.png',
  ice:       '/assets/elements/ice/snowflake-2.png',
  lightning: '/assets/elements/lightning/focused-lightning.png',
  poison:    '/assets/elements/poison/skull-with-syringe.png',
  earth:     '/assets/elements/earth/rock.png',
};

function getEnemySprite(enemy: Enemy): string {
  const n = enemy.name.toLowerCase();
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
  const [enemyTurnData, setEnemyTurnData] = useState<EnemyTurnData | null>(null);
  const [previewDamage, setPreviewDamage] = useState<number | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const dragRef = useRef<DragState | null>(null);
  const combatRef = useRef<CombatState | null>(null);
  const boardZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => { combatRef.current = combat; }, [combat]);

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

  // Attach drag listeners only while a drag is active
  useEffect(() => {
    if (!dragState) return;

    function onMove(e: PointerEvent) {
      if (!dragRef.current) return;
      const updated = { ...dragRef.current, x: e.clientX, y: e.clientY };
      dragRef.current = updated;
      setDragState(updated);
    }

    async function onUp(e: PointerEvent) {
      const ds = dragRef.current;
      if (!ds) return;

      const boardEl = boardZoneRef.current;
      let overBoard = false;
      if (boardEl) {
        const rect = boardEl.getBoundingClientRect();
        overBoard = e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top  && e.clientY <= rect.bottom;
      }

      if (!overBoard) {
        dragRef.current = null;
        setDragState(null);
        return;
      }

      const side: 'left' | 'right' = ds.flipped ? 'left' : 'right';
      const board = combatRef.current?.board;
      const valid = board ? canStonePlay(ds.stone, board)[side] : false;

      if (!valid) {
        const invalidState = { ...ds, invalid: true };
        dragRef.current = invalidState;
        setDragState(invalidState);
        setTimeout(() => { dragRef.current = null; setDragState(null); }, 400);
        return;
      }

      const stoneIndex = ds.stoneIndex;
      dragRef.current = null;
      setDragState(null);
      await playStone(stoneIndex, side);
    }

    function onKey(e: KeyboardEvent) {
      const ds = dragRef.current;
      if (!ds) return;
      if (e.key === 'r' || e.key === 'R') {
        const updated = { ...ds, flipped: !ds.flipped };
        dragRef.current = updated;
        setDragState(updated);
      }
      if (e.key === 'Escape') {
        dragRef.current = null;
        setDragState(null);
      }
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!dragState]);

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

  function handlePointerDown(index: number, stone: Stone, e: React.PointerEvent) {
    if (!combat || combat.phase !== 'player-turn') return;
    if (swapMode) { handleSwapStone(index); return; }
    const { left, right } = canStonePlay(stone, combat.board);
    if (!left && !right) return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const newState: DragState = {
      stoneIndex: index,
      stone,
      flipped: false,
      x: e.clientX,
      y: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      invalid: false,
    };
    dragRef.current = newState;
    setDragState(newState);
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
        if (data.triggeredRelics?.length > 0) flashRelics(data.triggeredRelics);
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
        setEnemyTurnData({
          enemyName: data.enemy.name,
          attack: data.enemyAttack
            ? {
                stonesPlayed: data.enemyAttack.stonesPlayed ?? [],
                rawDamage: data.enemyAttack.rawDamage,
                armorBlocked: data.enemyAttack.armorBlocked,
                damage: data.enemyAttack.damage,
              }
            : undefined,
          skipReason: data.enemySkipped?.reason,
          dotDamage: data.dotDamage ?? { burn: 0, poison: 0 },
        });
        setCombat(prev => prev ? {
          ...prev,
          playerState: data.playerState,
          enemy: data.enemy,
          board: data.board ?? prev.board,
          swapsUsed: 0,
          playerHand: data.hand ?? prev.playerHand,
        } : prev);
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
  const swapsLeft = combat.swapsPerTurn - combat.swapsUsed;

  const bgImage = `/assets/combat/background/arena-act${combat.act}.jpg`;

  const dragValidEnds = dragState
    ? canStonePlay(dragState.stone, combat.board)
    : undefined;

  const dragDisplayStone = dragState
    ? (dragState.flipped
        ? { ...dragState.stone, leftPip: dragState.stone.rightPip, rightPip: dragState.stone.leftPip }
        : dragState.stone)
    : null;

  return (
    <div
      className="combat-screen"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Stone reward overlay */}
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

      {/* ── Relic bar (centered top) ── */}
      {combat.playerState.relics && combat.playerState.relics.length > 0 && (
        <div className="combat-relic-bar">
          {combat.playerState.relics.map(id => {
            const img = relicImage(id);
            return img
              ? <img key={id} src={img} alt={id} className="combat-relic-icon" title={id} />
              : <span key={id} className="combat-relic-icon combat-relic-icon--fallback">✨</span>;
          })}
        </div>
      )}

      {/* ── Main area: board (centered) + enemy box (absolute right) ── */}
      <div className="combat-main">
        <div className="combat-enemy-hand-zone">
          <EnemyHand count={combat.enemyHandCount} />
        </div>
        <div className="combat-board-zone" ref={boardZoneRef}>
          <DominoBoard
            board={combat.board}
            isPlayerTurn={isPlayerTurn}
            dragValidEnds={dragValidEnds}
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
            <img
              className={`enemy-sprite${enemyHit ? ' enemy-sprite--hit' : ''}`}
              src={getEnemySprite(combat.enemy)}
              alt={combat.enemy.name}
            />
          </div>
        </div>
      </div>

      {/* ── Bottom: hero + hand ── */}
      <div className="combat-bottom">
        <div className="combat-player-zone">
          <img
            className={`hero-sprite${playerHit ? ' hero-sprite--hit' : ''}`}
            src="/assets/combat/hero/hero.png"
            alt="Hero"
          />
          <div className="hud-hp-track hud-hp-track--player">
            <div
              className="hud-hp-fill"
              style={{ width: `${Math.max(0, (combat.playerState.hp.current / combat.playerState.hp.max) * 100)}%` }}
            />
          </div>
          <div className="hud-hp-label">{combat.playerState.hp.current} / {combat.playerState.hp.max} HP</div>
        </div>

        <div className="combat-hand-tiles">
          {combat.playerHand.map((stone, i) => {
            const { left, right } = canStonePlay(stone, combat.board);
            const playable = isPlayerTurn && (left || right);
            const isDraggingThis = dragState?.stoneIndex === i;
            return (
              <div key={stone.id} className={isDraggingThis ? 'hand-tile--dragging' : undefined}>
                <DominoStone
                  stone={stone}
                  horizontal
                  onPointerDown={(e) => handlePointerDown(i, stone, e)}
                  disabled={!isPlayerTurn || (!swapMode && !playable)}
                  selected={swapMode}
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
          {previewDamage !== null && previewDamage > 0 && (
            <div className="combat-preview-damage">
              ⚔ {previewDamage} dmg
            </div>
          )}
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

      {/* ── Drag overlay ── */}
      {dragState && dragDisplayStone && (
        <div
          className={`drag-overlay${dragState.invalid ? ' drag-overlay--invalid' : ''}`}
          style={{ left: dragState.x - dragState.offsetX, top: dragState.y - dragState.offsetY }}
        >
          <DominoStone stone={dragDisplayStone} horizontal />
          <div className="drag-label">
            {dragState.flipped ? '← L' : 'R →'}
          </div>
        </div>
      )}

      {enemyTurnData && (
        <EnemyTurnSequence
          enemyName={combat.enemy.name}
          attack={enemyTurnData.attack}
          skipReason={enemyTurnData.skipReason}
          dotDamage={enemyTurnData.dotDamage}
          onDone={() => setEnemyTurnData(null)}
        />
      )}
    </div>
  );
}
