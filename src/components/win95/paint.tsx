'use client';

import { useEffect, useRef, useState } from 'react';

// M48: Paint.exe — a real canvas with pointer drawing, brushes, colours and a
// PNG export. Drawing itself is pointer-only (like any paint program); every
// control around it works from the keyboard.
const COLORS = ['#14110f', '#ff7c47', '#ff90e8', '#4cc9f0', '#a8e94d', '#ffd93d'];
const SIZES = [2, 6, 14];
const W = 360;
const H = 220;

export default function Paint() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[0]);
  const [strokes, setStrokes] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    const from = last.current;
    const to = point(e);
    if (!ctx || !from) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    last.current = to;
    setStrokes((n) => n + 1);
  };

  const onPointerUp = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    setStrokes(0);
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'kotree-paint.png';
    link.click();
  };

  const chip =
    'h-6 w-6 rounded-sm border-2 border-white border-b-black border-r-black cursor-pointer';
  const tool =
    'rounded-sm border-2 border-white border-b-black border-r-black bg-[#c0c0c0] px-2 py-0.5 text-xs font-bold text-black active:border-black active:border-b-white active:border-r-white cursor-pointer';

  return (
    <div className="flex h-full flex-col bg-[#c0c0c0] p-2 text-black">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1" role="group" aria-label="Brush colour">
          {COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => setColor(hex)}
              aria-label={`Brush colour ${hex}`}
              aria-pressed={color === hex}
              style={{ backgroundColor: hex }}
              className={`${chip} ${color === hex ? 'outline-3 outline-[#000080]' : ''}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Brush size">
          {SIZES.map((px) => (
            <button
              key={px}
              type="button"
              onClick={() => setSize(px)}
              aria-label={`Brush size ${px}px`}
              aria-pressed={size === px}
              className={`${tool} ${size === px ? 'outline-2 outline-[#000080]' : ''}`}
            >
              <span aria-hidden="true">{px}px</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={clear} className={tool}>
          Clear
        </button>
        <button type="button" onClick={download} className={tool}>
          Save PNG
        </button>
      </div>
      <div className="border-2 border-[#808080] bg-white p-1">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label="Drawing canvas — draw with a pointer or touch"
          className="h-auto w-full cursor-crosshair touch-none"
        />
      </div>
      <p className="mt-1 font-mono text-[10px]" role="status">
        {strokes > 0 ? `${strokes} stroke points` : 'Pick a colour and draw'}
      </p>
    </div>
  );
}
