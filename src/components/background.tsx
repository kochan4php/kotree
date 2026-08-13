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

    type Star = { x: number; y: number; r: number; phase: number; speed: number; alpha: number };
    let stars: Star[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let t = 0;

    const spawn = () => {
      stars = Array.from({ length: 160 }, (_, i) => ({
        x: Math.random(),
        y: Math.random(),
        r: (i % 5 === 0 ? 1.2 : 0.6) + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.6,
        alpha: 0.3 + Math.random() * 0.6,
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
        ctx.fillStyle = '#ff7c47';
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
      {/* Fallback blur blobs just in case canvas fails */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-20 right-1/3 w-64 h-64 bg-accent/20 rounded-full blur-3xl opacity-30"></div>

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
