// M54: visit streaks, the badge cabinet on /secrets, and the import guard for
// exported progress. Everything here is pure so the tests can pin it.

export interface AchievementState {
  secretsFound: number;
  totalSecrets: number;
  streak: number;
  veteran: boolean;
  quizBest: number;
  pollVoted: boolean;
  explored: boolean;
}

export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  description: string;
  earned: (state: AchievementState) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'streak3', emoji: '🔥', name: 'Three in a row', description: 'Visit three days in a row', earned: (s) => s.streak >= 3 },
  { id: 'streak7', emoji: '🗓️', name: 'Regular', description: 'Visit seven days in a row', earned: (s) => s.streak >= 7 },
  { id: 'secrets5', emoji: '🔓', name: 'Half the map', description: 'Find five secrets', earned: (s) => s.secretsFound >= 5 },
  { id: 'secretsAll', emoji: '🏆', name: 'Completionist', description: 'Find every secret', earned: (s) => s.totalSecrets > 0 && s.secretsFound >= s.totalSecrets },
  { id: 'veteran', emoji: '🎮', name: 'Old school', description: 'Enter the Konami code', earned: (s) => s.veteran },
  { id: 'quiz', emoji: '🧠', name: 'Kotree scholar', description: 'Score five out of five in the quiz', earned: (s) => s.quizBest >= 5 },
  { id: 'poll', emoji: '🗳️', name: 'Loud voice', description: 'Vote in a question of the day', earned: (s) => s.pollVoted },
  { id: 'explore', emoji: '🗺️', name: 'Cartographer', description: 'Open the explore map', earned: (s) => s.explored },
];

export const DAY_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function dayKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function previousDay(iso: string): string {
  // Noon avoids DST edges when stepping by a day
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return dayKey(date);
}

// Consecutive visiting days ending today (or yesterday — a streak only breaks
// once a whole day has been missed).
export function streakFrom(days: string[], today: string): number {
  const set = new Set(days);
  let cursor = today;
  if (!set.has(cursor)) {
    cursor = previousDay(cursor);
    if (!set.has(cursor)) return 0;
  }
  let count = 0;
  while (set.has(cursor)) {
    count++;
    cursor = previousDay(cursor);
  }
  return count;
}

// localStorage keys the /secrets panel exports and imports
export const PROGRESS_KEYS = {
  secrets: 'kotree-secrets',
  visitDays: 'kotree-visit-days',
  quizBest: 'kotree-quiz-best',
  veteran: 'kotree-konami-veteran',
  pollVoted: 'kotree-gb-poll',
} as const;

export interface ProgressExport {
  secrets: string[];
  visitDays: string[];
  quizBest: number;
  veteran: boolean;
  pollVoted: boolean;
}

// Import guard: the file comes off a user's disk, so every field is checked
// and clamped before it can touch localStorage.
export function sanitizeProgress(raw: unknown): ProgressExport | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const stringsFrom = (value: unknown, cap: number, re?: RegExp): string[] =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string' && (!re || re.test(item))).slice(0, cap)
      : [];
  const quizBest =
    typeof record.quizBest === 'number' && Number.isFinite(record.quizBest)
      ? Math.max(0, Math.min(5, Math.round(record.quizBest)))
      : 0;
  return {
    secrets: stringsFrom(record.secrets, 64),
    visitDays: stringsFrom(record.visitDays, 400, DAY_RE),
    quizBest,
    veteran: record.veteran === true,
    pollVoted: record.pollVoted === true,
  };
}
