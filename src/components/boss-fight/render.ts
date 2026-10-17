import type { GameState } from './game';

// Pure canvas drawing for the boss-fight overlay
export function drawGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
  bossImage: HTMLImageElement | null
) {
  const { player, boss, bullets, minions, rage } = state;
  const now = Date.now();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, width, height);

  // Player
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Minions: little orange squares with eyes so they read as enemies
  minions.forEach((m) => {
    ctx.fillStyle = '#ff9f1c';
    ctx.fillRect(m.x, m.y, m.width, m.height);
    ctx.strokeStyle = '#14110f';
    ctx.lineWidth = 3;
    ctx.strokeRect(m.x, m.y, m.width, m.height);
    ctx.fillStyle = '#14110f';
    ctx.fillRect(m.x + 7, m.y + 8, 4, 4);
    ctx.fillRect(m.x + m.width - 11, m.y + 8, 4, 4);
  });

  // Boss (angry red aura while enraged)
  if (rage) {
    ctx.strokeStyle = '#ff2d2d';
    ctx.lineWidth = 6;
    ctx.strokeRect(boss.x - 6, boss.y - 6, boss.width + 12, boss.height + 12);
  }
  if (bossImage && bossImage.complete) {
    ctx.drawImage(bossImage, boss.x, boss.y, boss.width, boss.height);
  } else {
    ctx.fillStyle = 'red';
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
  }

  // Boss HP bar
  ctx.fillStyle = 'red';
  ctx.fillRect(boss.x, boss.y - 20, boss.width, 10);
  ctx.fillStyle = rage ? '#ff9f1c' : 'green';
  ctx.fillRect(boss.x, boss.y - 20, (boss.hp / 100) * boss.width, 10);

  // Bullets
  bullets.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = b.isEnemy ? 'red' : 'cyan';
    ctx.fill();
    ctx.closePath();
  });

  // HUD
  const comboLive = state.combo > 1 && now - state.lastComboAt <= 2000;
  ctx.fillStyle = '#00ff00';
  ctx.font = '20px monospace';
  ctx.fillText('ARROW KEYS to move | SPACE to shoot | ESC to exit', 20, 30);

  ctx.textAlign = 'right';
  ctx.fillText(`SCORE ${state.score}`, width - 20, 30);
  if (comboLive) {
    ctx.fillStyle = '#ffe066';
    ctx.fillText(`COMBO x${state.combo}`, width - 20, 56);
  }
  ctx.fillStyle = '#00ff00';
  ctx.fillText(`WAVE ${state.wave}${rage ? ' | RAGE' : ''}`, width - 20, comboLive ? 82 : 56);
  ctx.textAlign = 'left';

  // Announcements (wave clear, rage phase) flash centre-screen
  if (state.flash && now < state.flash.until) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe066';
    ctx.font = 'bold 42px monospace';
    ctx.fillText(state.flash.text, width / 2, height / 2);
    ctx.textAlign = 'left';
  }
}
