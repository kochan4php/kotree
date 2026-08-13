'use client';

import { useEffect, useRef, useState } from 'react';
import { profile } from '@/data/profile';
import { toast } from 'sonner';
import { createGameState, updateGame } from './game';
import { drawGame } from './render';

export default function BossFight() {
  const [isActive, setIsActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleActivate = () => {
      setIsActive(true);
    };
    window.addEventListener('ACTIVATE_BOSS_FIGHT', handleActivate);
    return () => window.removeEventListener('ACTIVATE_BOSS_FIGHT', handleActivate);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!isActive || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const state = createGameState(canvas.width, canvas.height);
    const bossImage = new Image();
    bossImage.src = profile.avatarUrl;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') state.keys.ArrowLeft = true;
      if (e.code === 'ArrowRight') state.keys.ArrowRight = true;
      if (e.code === 'Space') state.keys.Space = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') state.keys.ArrowLeft = false;
      if (e.code === 'ArrowRight') state.keys.ArrowRight = false;
      if (e.code === 'Space') state.keys.Space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let animationId: number;
    const loop = () => {
      const outcome = updateGame(state, canvas.width, canvas.height);
      if (outcome === 'player-dead') {
        toast.error('YOU DIED! The Boss defeated you.');
        setIsActive(false);
        return;
      }
      if (outcome === 'boss-defeated') {
        toast.success('BOSS DEFEATED! You are worthy.');
        setIsActive(false);
        return;
      }
      drawGame(ctx, state, canvas.width, canvas.height, bossImage);
      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-99999 pointer-events-auto cursor-crosshair">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
