import { useEffect, useRef } from 'react';

const COLS = 5;
const ROWS = 5;
const TOTAL_FRAMES = COLS * ROWS;       // 25
const NATIVE_FRAME_PX = 256;            // 1280px sheet / 5 columns
const DISPLAY_PX = 300;
const FPS = 10;

export type HeroAnim = 'idle' | 'attack' | 'magic-cast';

const SHEET: Record<HeroAnim, string> = {
  'idle':       '/assets/combat/hero/hero-idle.png',
  'attack':     '/assets/combat/hero/hero-attack.png',
  'magic-cast': '/assets/combat/hero/hero-magic-cast.png',
};

interface Props {
  anim: HeroAnim;
  hit: boolean;
}

export function HeroSprite({ anim, hit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const imgRef = useRef<HTMLImageElement | null>(null);

  function drawFrame(img: HTMLImageElement, f: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const col = f % COLS;
    const row = Math.floor(f / ROWS);
    ctx.clearRect(0, 0, DISPLAY_PX, DISPLAY_PX);
    ctx.drawImage(
      img,
      col * NATIVE_FRAME_PX, row * NATIVE_FRAME_PX,   // source x, y
      NATIVE_FRAME_PX, NATIVE_FRAME_PX,                // source w, h
      0, 0,                                            // dest x, y
      DISPLAY_PX, DISPLAY_PX,                          // dest w, h
    );
  }

  // Reload image whenever animation changes
  useEffect(() => {
    frameRef.current = 0;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      drawFrame(img, 0);
    };
    img.src = SHEET[anim];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim]);

  // Tick frames
  useEffect(() => {
    const id = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % TOTAL_FRAMES;
      if (imgRef.current) drawFrame(imgRef.current, frameRef.current);
    }, 1000 / FPS);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={DISPLAY_PX}
      height={DISPLAY_PX}
      className={`hero-sprite${hit ? ' hero-sprite--hit' : ''}`}
    />
  );
}
