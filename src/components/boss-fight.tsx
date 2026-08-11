'use client';

import { useEffect, useRef, useState } from 'react';
import { profile } from '@/data/profile';
import { toast } from 'sonner';

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
    if (!isActive || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationId: number;
    
    // Player
    const player = {
      x: canvas.width / 2,
      y: canvas.height - 100,
      width: 30,
      height: 30,
      speed: 7,
      dx: 0
    };

    // Boss
    const boss = {
      x: canvas.width / 2 - 50,
      y: 50,
      width: 100,
      height: 100,
      speed: 4,
      dx: 4,
      hp: 100
    };

    const bullets: { x: number, y: number, speed: number, radius: number, isEnemy: boolean }[] = [];

    const bossImage = new Image();
    bossImage.src = profile.avatarUrl;

    let keys = { ArrowLeft: false, ArrowRight: false, Space: false };
    let lastShot = 0;
    let lastBossShot = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
      if (e.code === 'ArrowRight') keys.ArrowRight = true;
      if (e.code === 'Space') keys.Space = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
      if (e.code === 'ArrowRight') keys.ArrowRight = false;
      if (e.code === 'Space') keys.Space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const update = () => {
      // Player movement
      if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
      if (keys.ArrowRight && player.x < canvas.width - player.width) player.x += player.speed;

      // Player shooting
      if (keys.Space && Date.now() - lastShot > 200) {
        bullets.push({ x: player.x + player.width / 2, y: player.y, speed: -10, radius: 5, isEnemy: false });
        lastShot = Date.now();
      }

      // Boss movement
      boss.x += boss.dx;
      if (boss.x < 0 || boss.x > canvas.width - boss.width) {
        boss.dx *= -1;
      }

      // Boss shooting
      if (Date.now() - lastBossShot > 500) {
        bullets.push({ x: boss.x + boss.width / 2, y: boss.y + boss.height, speed: 7, radius: 8, isEnemy: true });
        lastBossShot = Date.now();
      }

      // Bullets update
      for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y += bullets[i].speed;
        
        // Collision with boss
        if (!bullets[i].isEnemy && 
            bullets[i].x > boss.x && bullets[i].x < boss.x + boss.width &&
            bullets[i].y > boss.y && bullets[i].y < boss.y + boss.height) {
          boss.hp -= 5;
          bullets.splice(i, 1);
          continue;
        }

        // Collision with player
        if (bullets[i].isEnemy && 
            bullets[i].x > player.x && bullets[i].x < player.x + player.width &&
            bullets[i].y > player.y && bullets[i].y < player.y + player.height) {
          // Game Over
          toast.error("YOU DIED! The Boss defeated you.");
          setIsActive(false);
          return;
        }

        if (bullets[i].y < 0 || bullets[i].y > canvas.height) {
          bullets.splice(i, 1);
        }
      }

      if (boss.hp <= 0) {
        toast.success("BOSS DEFEATED! You are worthy.");
        setIsActive(false);
        return;
      }
    };

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Player
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(player.x, player.y, player.width, player.height);

      // Draw Boss
      if (bossImage.complete) {
        ctx.drawImage(bossImage, boss.x, boss.y, boss.width, boss.height);
      } else {
        ctx.fillStyle = 'red';
        ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
      }

      // Boss HP Bar
      ctx.fillStyle = 'red';
      ctx.fillRect(boss.x, boss.y - 20, boss.width, 10);
      ctx.fillStyle = 'green';
      ctx.fillRect(boss.x, boss.y - 20, (boss.hp / 100) * boss.width, 10);

      // Draw Bullets
      bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.isEnemy ? 'red' : 'cyan';
        ctx.fill();
        ctx.closePath();
      });
      
      // Draw Instructions
      ctx.fillStyle = 'white';
      ctx.font = '20px monospace';
      ctx.fillText('ARROW KEYS to move | SPACE to shoot', 20, 30);
    };

    const loop = () => {
      update();
      if (!isActive) return;
      draw();
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
    <div className="fixed inset-0 z-[99999] pointer-events-auto cursor-crosshair">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
