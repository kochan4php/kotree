import type { GameState } from './game';

// Pure canvas drawing for the boss-fight overlay
export function drawGame(ctx: CanvasRenderingContext2D, state: GameState, width: number, height: number, bossImage: HTMLImageElement | null) {
  const { player, boss, bullets } = state;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, width, height);

  // Player
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Boss
  if (bossImage && bossImage.complete) {
    ctx.drawImage(bossImage, boss.x, boss.y, boss.width, boss.height);
  } else {
    ctx.fillStyle = 'red';
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
  }

  // Boss HP bar
  ctx.fillStyle = 'red';
  ctx.fillRect(boss.x, boss.y - 20, boss.width, 10);
  ctx.fillStyle = 'green';
  ctx.fillRect(boss.x, boss.y - 20, (boss.hp / 100) * boss.width, 10);

  // Bullets
  bullets.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = b.isEnemy ? 'red' : 'cyan';
    ctx.fill();
    ctx.closePath();
  });

  // Instructions
  ctx.fillStyle = 'white';
  ctx.font = '20px monospace';
  ctx.fillText('ARROW KEYS to move | SPACE to shoot', 20, 30);
}
