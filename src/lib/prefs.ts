// Visitor preferences: theme, accent colour, background effects, sound.
// Stored in localStorage and mirrored onto <html> data-attributes, so CSS
// (and the inline script in the layout, which runs before first paint) can
// react without a flash of the wrong theme.

export type Theme = 'auto' | 'light' | 'dark' | 'oled';
export type Accent = 'orange' | 'pink' | 'blue' | 'green' | 'violet' | 'yellow';

/** M84: a visitor-picked accent with its inks pre-derived and pre-validated. */
export interface CustomAccent {
  hex: string;
  inkLight: string;
  inkDark: string;
  foreground: string;
}

export interface Prefs {
  theme: Theme;
  accent: Accent;
  /** M84: free accent colour; null keeps the preset accent. */
  customAccent: CustomAccent | null;
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
  /** G9: tell me when a message queued offline reaches the wall. */
  notify: boolean;
  /** P9: reading comfort, independent of the theme. 0.9–1.4. */
  textScale: number;
  /** P9: note body leading; numbers keep the CSS simple. */
  lineHeight: number;
  /** P9: wider letter/word spacing and a plainer face for note bodies. */
  readableFont: boolean;
}

export const PREFS_KEY = 'kotree-prefs';

export const DEFAULT_PREFS: Prefs = {
  theme: 'auto',
  accent: 'orange',
  customAccent: null,
  fx: true,
  sound: true,
  reduceMotion: false,
  seasons: true,
  volume: 0.7,
  soundTaps: true,
  soundAlerts: true,
  notify: false,
  textScale: 1,
  lineHeight: 1.7,
  readableFont: false,
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

const HEX = /^#[0-9a-f]{6}$/i;

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
    merged.notify = merged.notify === true;
    merged.textScale =
      typeof merged.textScale === 'number' && Number.isFinite(merged.textScale)
        ? Math.min(1.4, Math.max(0.9, merged.textScale))
        : DEFAULT_PREFS.textScale;
    merged.lineHeight =
      typeof merged.lineHeight === 'number' && Number.isFinite(merged.lineHeight)
        ? Math.min(2, Math.max(1.4, merged.lineHeight))
        : DEFAULT_PREFS.lineHeight;
    merged.readableFont = merged.readableFont === true;
    const custom = merged.customAccent;
    merged.customAccent =
      custom &&
      [custom.hex, custom.inkLight, custom.inkDark, custom.foreground].every(
        (value) => typeof value === 'string' && HEX.test(value)
      )
        ? custom
        : null;
    return merged;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme === 'light' ? 'light' : 'dark'; // 'oled' is dark, only blacker
}

const THEME_COLORS = { light: '#fff7e9', dark: '#1a1613', oled: '#000000' } as const;

// K15: the mobile URL bar follows the resolved theme AND the accent — the
// accent swatch in light mode, the calm dark background at night. The inline
// bootstrap script in the layout mirrors this mapping before first paint.
function themeColor(prefs: Prefs): string {
  if (prefs.theme === 'oled') return THEME_COLORS.oled;
  if (resolveTheme(prefs.theme) === 'dark') return THEME_COLORS.dark;
  if (prefs.customAccent) return prefs.customAccent.hex;
  return ACCENTS.find((accent) => accent.id === prefs.accent)?.swatch ?? THEME_COLORS.light;
}

export function applyPrefs(prefs: Prefs): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const style = root.style;
  const resolved = resolveTheme(prefs.theme);
  root.dataset.theme = prefs.theme === 'oled' ? 'oled' : resolved;
  root.dataset.accent = prefs.customAccent ? 'custom' : prefs.accent;
  root.dataset.fx = prefs.fx ? 'on' : 'off';
  root.dataset.motion = prefs.reduceMotion ? 'off' : 'on';
  root.dataset.readableFont = prefs.readableFont ? 'on' : 'off';
  style.setProperty('--reading-scale', String(prefs.textScale));
  style.setProperty('--reading-leading', String(prefs.lineHeight));
  // M84: inline vars beat any preset block; cleared again when a preset is chosen
  if (prefs.customAccent) {
    style.setProperty('--accent', prefs.customAccent.hex);
    style.setProperty('--accent-ink', resolved === 'dark' ? prefs.customAccent.inkDark : prefs.customAccent.inkLight);
    style.setProperty('--accent-foreground', prefs.customAccent.foreground);
  } else {
    style.removeProperty('--accent');
    style.removeProperty('--accent-ink');
    style.removeProperty('--accent-foreground');
  }
  // Keep the browser chrome (mobile URL bar) in step with theme + accent
  syncThemeColor(themeColor(prefs));
}

let lastThemeColor: string | null = null;
let themeColorWatched = false;

function syncThemeColor(color: string): void {
  lastThemeColor = color;
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute('content', color));
  // Hydration re-inserts Next's own static theme-color meta; keep any late
  // copy in sync so the URL bar keeps the right colour whichever one wins.
  if (themeColorWatched) return;
  themeColorWatched = true;
  new MutationObserver(() => {
    if (lastThemeColor) syncThemeColor(lastThemeColor);
  }).observe(document.head, { childList: true });
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

// Cycle auto → light → dark → OLED, wrapped in a native crossfade where supported.
export function cycleTheme(): Theme {
  const order: Theme[] = ['auto', 'light', 'dark', 'oled'];
  const next = order[(order.indexOf(readPrefs().theme) + 1) % order.length];
  runViewTransition(() => writePrefs({ theme: next }));
  return next;
}
