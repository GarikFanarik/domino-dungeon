import { useEffect, useRef, useState } from 'react';

const COLS = 5;
const TOTAL_FRAMES = COLS * COLS; // 5×5 = 25
const FRAME_PX = 300;
const FPS = 10;

export type HeroAnim = 'idle' | 'attack' | 'magic-cast';

const SHEET: Record<HeroAnim, string> = {
  'idle':        '/assets/combat/hero/hero-idle.png',
  'attack':      '/assets/combat/hero/hero-attack.png',
  'magic-cast':  '/assets/combat/hero/hero-magic-cast.png',
};

interface Props {
  anim: HeroAnim;
  hit: boolean;
}

export function HeroSprite({ anim, hit }: Props) {
  const [frame, setFrame] = useState(0);
  const prevAnim = useRef(anim);

  useEffect(() => {
    if (prevAnim.current !== anim) {
      setFrame(0);
      prevAnim.current = anim;
    }
  }, [anim]);

  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % TOTAL_FRAMES), 1000 / FPS);
    return () => clearInterval(id);
  }, []);

  const col = frame % COLS;
  const row = Math.floor(frame / COLS);
  const sheetPx = FRAME_PX * COLS;

  return (
    <div
      className={`hero-sprite${hit ? ' hero-sprite--hit' : ''}`}
      style={{ width: FRAME_PX, height: FRAME_PX, overflow: 'hidden', position: 'relative' }}
    >
      <img
        src={SHEET[anim]}
        alt=""
        style={{
          position: 'absolute',
          left: -(col * FRAME_PX),
          top: -(row * FRAME_PX),
          width: sheetPx,
          height: sheetPx,
        }}
      />
    </div>
  );
}
