'use client';

import { useEffect, useRef } from 'react';

// Canvas-2D starfield: same warm-orange vibe as the old three.js Points,
// at a fraction of the cost. No WebGL, no three.js in the bundle.
export default function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Star = { x: number; y: number; r: number; phase: number; speed: number; alpha: number; color: string };
    let stars: Star[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let t = 0;

    // Confetti dots in the tint palette — flat, colorful, on-brand
    const PALETTE = ['#ff7c47', '#ff90e8', '#4cc9f0', '#a8e94d', '#b39dfb', '#ffd93d', '#14110f'];

    const spawn = () => {
      stars = Array.from({ length: 160 }, (_, i) => ({
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
    };

    const draw = () => {
      t += 0.005;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const twinkle = 0.6 + 0.4 * Math.sin(t * s.speed * 4 + s.phase);
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
      if (!reduced) raf = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else if (!reduced) {
        raf = requestAnimationFrame(loop);
      }
    };

    resize();
    loop();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {/* Flat color shapes instead of glassy blobs — canvas fallback */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-[#ffd93d]/25 rounded-full opacity-70"></div>
      <div className="absolute bottom-20 right-1/3 w-64 h-64 bg-[#ff90e8]/20 rounded-full opacity-60"></div>
      <div className="absolute top-1/2 right-10 w-40 h-40 bg-[#4cc9f0]/20 rounded-3xl opacity-60 rotate-12"></div>

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
