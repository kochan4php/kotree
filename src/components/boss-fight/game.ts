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

export interface Minion {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  swayPhase: number;
}

export interface GameState {
  player: Rect;
  boss: Rect & { hp: number };
  bullets: Bullet[];
  minions: Minion[];
  keys: { ArrowLeft: boolean; ArrowRight: boolean; Space: boolean };
  lastShot: number;
  lastBossShot: number;
  startedAt: number;
  rage: boolean;
  wave: number;
  nextWaveAt: number;
  score: number;
  combo: number;
  lastComboAt: number;
  flash: { text: string; until: number } | null;
}

export type GameOutcome = 'playing' | 'player-dead' | 'boss-defeated';

// Boss holds fire while the player gets their bearings — dying ~1.5s after
// spawn (before you can react) was a trap, not a game.
const SPAWN_GRACE_MS = 2500;
// K27 tuning: these knobs carry the whole difficulty curve.
const RAGE_HP = 40;
const COMBO_WINDOW_MS = 2000;
const WAVE_FIRST_MS = 6000;
const WAVE_GAP_MS = 5000;

export function createGameState(width: number, height: number): GameState {
  const now = Date.now();
  return {
    player: { x: width / 2, y: height - 100, width: 30, height: 30, speed: 7, dx: 0 },
    boss: { x: width / 2 - 50, y: 50, width: 100, height: 100, speed: 4, dx: 4, hp: 100 },
    bullets: [],
    minions: [],
    keys: { ArrowLeft: false, ArrowRight: false, Space: false },
    lastShot: 0,
    lastBossShot: 0,
    startedAt: now,
    rage: false,
    wave: 0,
    nextWaveAt: now + WAVE_FIRST_MS,
    score: 0,
    combo: 0,
    lastComboAt: 0,
    flash: null,
  };
}

// Bullets are points, minions are rects — one helper covers both against a rect.
function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: Bullet | Minion
): boolean {
  return 'radius' in b
    ? b.x > a.x && b.x < a.x + a.width && b.y > a.y && b.y < a.y + a.height
    : b.x < a.x + a.width && b.x + b.width > a.x && b.y < a.y + a.height && b.y + b.height > a.y;
}

// Chain hits inside a 2s window for a bigger multiplier; a slower hit starts
// a fresh chain.
function addScore(state: GameState, base: number, now: number): void {
  if (now - state.lastComboAt <= COMBO_WINDOW_MS) state.combo += 1;
  else state.combo = 1;
  state.lastComboAt = now;
  state.score += base * state.combo;
}

export function updateGame(state: GameState, width: number, height: number): GameOutcome {
  const { player, boss, bullets, minions, keys } = state;
  const now = Date.now();

  // Rage phase: the boss stops being polite once worn down
  if (!state.rage && boss.hp > 0 && boss.hp <= RAGE_HP) {
    state.rage = true;
    state.flash = { text: 'RAGE PHASE', until: now + 1500 };
  }

  // Player movement
  if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
  if (keys.ArrowRight && player.x < width - player.width) player.x += player.speed;

  // Player shooting
  if (keys.Space && now - state.lastShot > 200) {
    bullets.push({ x: player.x + player.width / 2, y: player.y, speed: -10, radius: 5, isEnemy: false });
    state.lastShot = now;
  }

  // Boss movement (faster while enraged)
  boss.dx = Math.sign(boss.dx) * (state.rage ? 6 : 4);
  boss.x += boss.dx;
  if (boss.x < 0 || boss.x > width - boss.width) boss.dx *= -1;

  // Boss shooting (skipped during the spawn grace); rage adds a spread
  const bossInterval = state.rage ? 320 : 500;
  if (now - state.startedAt > SPAWN_GRACE_MS && now - state.lastBossShot > bossInterval) {
    bullets.push({ x: boss.x + boss.width / 2, y: boss.y + boss.height, speed: 7, radius: 8, isEnemy: true });
    if (state.rage) {
      bullets.push({ x: boss.x + boss.width * 0.2, y: boss.y + boss.height, speed: 7, radius: 8, isEnemy: true });
      bullets.push({ x: boss.x + boss.width * 0.8, y: boss.y + boss.height, speed: 7, radius: 8, isEnemy: true });
    }
    state.lastBossShot = now;
  }

  // Waves spawn when the field is clear and the clock says so
  if (minions.length === 0 && now >= state.nextWaveAt) {
    state.wave += 1;
    const count = Math.min(2 + state.wave, 6);
    for (let i = 0; i < count; i++) {
      const size = 26;
      minions.push({
        x: 30 + Math.random() * Math.max(1, width - 60 - size),
        y: 130 + (i % 3) * 46,
        width: size,
        height: size,
        speed: 1.1 + state.wave * 0.25,
        swayPhase: Math.random() * Math.PI * 2,
      });
    }
    state.nextWaveAt = now + WAVE_GAP_MS;
  }

  // Minions: sway downward, loop back from the top, deadly on touch
  for (const m of minions) {
    m.swayPhase += 0.05;
    m.y += m.speed;
    m.x = Math.max(0, Math.min(width - m.width, m.x + Math.sin(m.swayPhase) * 1.4));
    if (m.y > height) m.y = 120;
    if (overlaps(player, m)) return 'player-dead';
  }

  // Bullets update + collisions
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y += b.speed;

    if (b.isEnemy) {
      if (overlaps(player, b)) return 'player-dead';
    } else if (b.x > boss.x && b.x < boss.x + boss.width && b.y > boss.y && b.y < boss.y + boss.height) {
      boss.hp -= 5;
      addScore(state, 10, now);
      bullets.splice(i, 1);
      continue;
    } else {
      const hit = minions.findIndex((m) => overlaps(m, b));
      if (hit !== -1) {
        minions.splice(hit, 1);
        addScore(state, 25, now);
        if (minions.length === 0 && state.wave > 0) {
          // Clearing a wave pays a flat bonus — no multiplier, it is already the reward
          const bonus = 50 * state.wave;
          state.score += bonus;
          state.flash = { text: `WAVE ${state.wave} CLEAR +${bonus}`, until: now + 1500 };
        }
        bullets.splice(i, 1);
        continue;
      }
    }

    if (b.y < 0 || b.y > height) bullets.splice(i, 1);
  }

  return boss.hp <= 0 ? 'boss-defeated' : 'playing';
}
