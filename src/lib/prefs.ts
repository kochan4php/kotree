// Visitor preferences: theme, accent colour, background effects, sound.
// Stored in localStorage and mirrored onto <html> data-attributes, so CSS
// (and the inline script in the layout, which runs before first paint) can
// react without a flash of the wrong theme.

export type Theme = 'auto' | 'light' | 'dark';
export type Accent = 'orange' | 'pink' | 'blue' | 'green' | 'violet' | 'yellow';

export interface Prefs {
  theme: Theme;
  accent: Accent;
  fx: boolean;
  sound: boolean;
  /** M20: explicit "Reduce motion" switch, on top of the OS setting. */
  reduceMotion: boolean;
  /** M58: seasonal greetings and decorations. */
  seasons: boolean;
  /** M59: master volume for the little synth, 0–1. */
  volume: number;
  /** M59: sound preferences per action kind — taps vs alerts. */
  soundTaps: boolean;
  soundAlerts: boolean;
}

export const PREFS_KEY = 'kotree-prefs';

export const DEFAULT_PREFS: Prefs = {
  theme: 'auto',
  accent: 'orange',
  fx: true,
  sound: true,
  reduceMotion: false,
  seasons: true,
  volume: 0.7,
  soundTaps: true,
  soundAlerts: true,
};

export type SoundKind = 'tap' | 'alert';

// M59: one gate for every blip — master switch, per-kind switch, and a silent
// tab (no audio while the visitor is looking elsewhere).
export function soundAllowed(kind: SoundKind, prefs: Prefs = readPrefs()): boolean {
  if (!prefs.sound) return false;
  if (typeof document !== 'undefined' && document.hidden) return false;
  return kind === 'tap' ? prefs.soundTaps : prefs.soundAlerts;
}

// M70: haptics ride the same switches as the sounds (a visitor who muted taps
// does not want a buzz instead), so the only new decision is the shape of the
// vibration. `navigator.vibrate` is Android-Chromium-only — everyone else
// silently skips it.
export function hapticPattern(kind: SoundKind, prefs: Prefs = readPrefs()): number | number[] | null {
  if (!soundAllowed(kind, prefs)) return null;
  return kind === 'tap' ? 15 : [12, 40, 12];
}

// M20: one gate for every effect — the OS setting or the in-app preference.
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    document.documentElement.dataset.motion === 'off' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export const ACCENTS: { id: Accent; label: string; swatch: string }[] = [
  { id: 'orange', label: 'Orange', swatch: '#ff7c47' },
  { id: 'pink', label: 'Pink', swatch: '#ff90e8' },
  { id: 'blue', label: 'Blue', swatch: '#4cc9f0' },
  { id: 'green', label: 'Green', swatch: '#a8e94d' },
  { id: 'violet', label: 'Violet', swatch: '#b39dfb' },
  { id: 'yellow', label: 'Yellow', swatch: '#ffd93d' },
];

export function readPrefs(): Prefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<Prefs>;
    const merged = { ...DEFAULT_PREFS, ...raw };
    // Hand-edited storage gets clamped like any other untrusted input
    merged.volume =
      typeof merged.volume === 'number' && Number.isFinite(merged.volume)
        ? Math.min(1, Math.max(0, merged.volume))
        : DEFAULT_PREFS.volume;
    merged.soundTaps = merged.soundTaps !== false;
    merged.soundAlerts = merged.soundAlerts !== false;
    merged.seasons = merged.seasons !== false;
    return merged;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'auto') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const THEME_COLORS = { light: '#fff7e9', dark: '#1a1613' } as const;

// K15: the mobile URL bar follows the resolved theme AND the accent — the
// accent swatch in light mode, the calm dark background at night. The inline
// bootstrap script in the layout mirrors this mapping before first paint.
function themeColor(prefs: Prefs): string {
  if (resolveTheme(prefs.theme) === 'dark') return THEME_COLORS.dark;
  return ACCENTS.find((accent) => accent.id === prefs.accent)?.swatch ?? THEME_COLORS.light;
}

export function applyPrefs(prefs: Prefs): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const resolved = resolveTheme(prefs.theme);
  root.dataset.theme = resolved;
  root.dataset.accent = prefs.accent;
  root.dataset.fx = prefs.fx ? 'on' : 'off';
  root.dataset.motion = prefs.reduceMotion ? 'off' : 'on';
  // Keep the browser chrome (mobile URL bar) in step with theme + accent
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor(prefs));
}

export function writePrefs(patch: Partial<Prefs>): Prefs {
  const next = { ...readPrefs(), ...patch };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    // private mode — applied for this session only
  }
  applyPrefs(next);
  window.dispatchEvent(new CustomEvent('kotree:prefs', { detail: next }));
  return next;
}

// Crossfade the theme change with the native View Transitions API where the
// browser supports it (skipped under reduced motion).
export function runViewTransition(update: () => void): void {
  if (typeof document.startViewTransition === 'function' && !prefersReducedMotion()) {
    document.startViewTransition(update);
  } else {
    update();
  }
}

// Cycle auto → light → dark, wrapped in a native crossfade where supported.
export function cycleTheme(): Theme {
  const order: Theme[] = ['auto', 'light', 'dark'];
  const next = order[(order.indexOf(readPrefs().theme) + 1) % order.length];
  runViewTransition(() => writePrefs({ theme: next }));
  return next;
}
