// Boss-fight game state + update logic (pure canvas game, no React)

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  dx: number;
}

export interface Bullet {
  x: number;
  y: number;
  speed: number;
  radius: number;
  isEnemy: boolean;
}

export interface GameState {
  player: Rect;
  boss: Rect & { hp: number };
  bullets: Bullet[];
  keys: { ArrowLeft: boolean; ArrowRight: boolean; Space: boolean };
  lastShot: number;
  lastBossShot: number;
}

export type GameOutcome = 'playing' | 'player-dead' | 'boss-defeated';

export function createGameState(width: number, height: number): GameState {
  return {
    player: { x: width / 2, y: height - 100, width: 30, height: 30, speed: 7, dx: 0 },
    boss: { x: width / 2 - 50, y: 50, width: 100, height: 100, speed: 4, dx: 4, hp: 100 },
    bullets: [],
    keys: { ArrowLeft: false, ArrowRight: false, Space: false },
    lastShot: 0,
    lastBossShot: 0,
  };
}

export function updateGame(state: GameState, width: number, height: number): GameOutcome {
  const { player, boss, bullets, keys } = state;
  const now = Date.now();

  // Player movement
  if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
  if (keys.ArrowRight && player.x < width - player.width) player.x += player.speed;

  // Player shooting
  if (keys.Space && now - state.lastShot > 200) {
    bullets.push({ x: player.x + player.width / 2, y: player.y, speed: -10, radius: 5, isEnemy: false });
    state.lastShot = now;
  }

  // Boss movement
  boss.x += boss.dx;
  if (boss.x < 0 || boss.x > width - boss.width) boss.dx *= -1;

  // Boss shooting
  if (now - state.lastBossShot > 500) {
    bullets.push({ x: boss.x + boss.width / 2, y: boss.y + boss.height, speed: 7, radius: 8, isEnemy: true });
    state.lastBossShot = now;
  }

  // Bullets update + collisions
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y += b.speed;

    if (!b.isEnemy && b.x > boss.x && b.x < boss.x + boss.width && b.y > boss.y && b.y < boss.y + boss.height) {
      boss.hp -= 5;
      bullets.splice(i, 1);
      continue;
    }

    if (b.isEnemy && b.x > player.x && b.x < player.x + player.width && b.y > player.y && b.y < player.y + player.height) {
      return 'player-dead';
    }

    if (b.y < 0 || b.y > height) bullets.splice(i, 1);
  }

  return boss.hp <= 0 ? 'boss-defeated' : 'playing';
}
