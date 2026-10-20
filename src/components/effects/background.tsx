'use client';

import { useEffect, useRef, useState } from 'react';
import { readPrefs, prefersReducedMotion } from '@/lib/prefs';

type Mode = 'off' | 'static' | 'animate';

// 'off' when the visitor disabled effects, is on a save-data connection, or
// has no JS budget to spare; 'static' under reduced motion or low battery
// (a single painted frame, no loop).
function resolveMode(lowPower: boolean): Mode {
  if (!readPrefs().fx) return 'off';
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return 'off';
  if (prefersReducedMotion()) return 'static';
  return lowPower ? 'static' : 'animate';
}

// Canvas-2D starfield: same warm-orange vibe as the old three.js Points,
// at a fraction of the cost. No WebGL, no three.js in the bundle.
export default function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>('animate');

  useEffect(() => {
    let lowPower = false;
    const update = () => setMode(resolveMode(lowPower));
    update();

    // Battery: freeze the animation below 15% while unplugged
    type BatteryManager = { level: number; charging: boolean };
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> };
    nav.getBattery?.()
      .then((b) => {
        if (!b.charging && b.level <= 0.15) {
          lowPower = true;
          update();
        }
      })
      .catch(() => {});

    window.addEventListener('kotree:prefs', update);
    return () => window.removeEventListener('kotree:prefs', update);
  }, []);

  useEffect(() => {
    if (mode === 'off') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animated = mode === 'animate';
    const lowEnd = ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
    const dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 2);

    type Star = { x: number; y: number; r: number; phase: number; speed: number; alpha: number; color: string };
    let stars: Star[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let t = 0;

    // Confetti dots in the tint palette — flat, colorful, on-brand
    const PALETTE = ['#ff7c47', '#ff90e8', '#4cc9f0', '#a8e94d', '#b39dfb', '#ffd93d', '#14110f'];

    const spawn = () => {
      const count = lowEnd ? 90 : 160;
      stars = Array.from({ length: count }, (_, i) => ({
        x: Math.random(),
        y: Math.random(),
        r: (i % 5 === 0 ? 1.6 : 0.9) + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.6,
        alpha: 0.18 + Math.random() * 0.25,
        color: PALETTE[i % PALETTE.length],
      }));
    };

    const resize = () => {
      w = canvas.width = Math.floor(window.innerWidth * dpr);
      h = canvas.height = Math.floor(window.innerHeight * dpr);
      spawn();
      draw();
    };

    const draw = () => {
      t += 0.005;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const twinkle = animated ? 0.6 + 0.4 * Math.sin(t * s.speed * 4 + s.phase) : 0.8;
        ctx.globalAlpha = s.alpha * twinkle;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else if (animated) {
        raf = requestAnimationFrame(loop);
      }
    };

    resize();
    if (animated) loop();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [mode]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {mode !== 'off' && (
        <>
          {/* Flat color shapes instead of glassy blobs — canvas fallback */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#ffd93d]/25 rounded-full opacity-70 md:top-16 md:left-24 md:w-96 md:h-96"></div>
          <div className="absolute bottom-20 right-1/3 w-64 h-64 bg-[#ff90e8]/20 rounded-full opacity-60 md:w-80 md:h-80"></div>
          <div className="absolute top-1/2 right-10 w-40 h-40 bg-[#4cc9f0]/20 rounded-3xl opacity-60 rotate-12 md:right-24 md:w-52 md:h-52"></div>
        </>
      )}

      {/* Dotted paper texture fills the wide margins on tablets and desktops */}
      <div className="dot-grid absolute inset-0 hidden opacity-[0.045] md:block"></div>

      {mode !== 'off' && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />}
    </div>
  );
}
