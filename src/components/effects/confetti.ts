import { readPrefs, prefersReducedMotion } from '@/lib/prefs';

// One-shot canvas confetti — no dependency, removes itself when done.
// Respects the effects preference and reduced motion.
export function fireConfetti(): void {
  if (typeof window === 'undefined') return;
  if (!readPrefs().fx) return;
  if (prefersReducedMotion()) return;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:150';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);

  const COLORS = ['#ff7c47', '#ff90e8', '#4cc9f0', '#a8e94d', '#b39dfb', '#ffd93d'];
  const cx = canvas.width / 2;
  const cy = canvas.height * 0.35;
  const pieces = Array.from({ length: 110 }, () => ({
    x: cx + (Math.random() - 0.5) * 60 * dpr,
    y: cy + (Math.random() - 0.5) * 40 * dpr,
    vx: (Math.random() - 0.5) * 13 * dpr,
    vy: (-Math.random() * 11 - 3) * dpr,
    size: (4 + Math.random() * 5) * dpr,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));

  const GRAVITY = 0.32 * dpr;
  const started = performance.now();
  const tick = (now: number) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of pieces) {
      p.vy += GRAVITY;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);
      ctx.restore();
    }
    if (now - started < 2400) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}
