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
}

export const PREFS_KEY = 'kotree-prefs';

export const DEFAULT_PREFS: Prefs = { theme: 'auto', accent: 'orange', fx: true, sound: true };

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
    return { ...DEFAULT_PREFS, ...raw };
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
  if (
    typeof document.startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
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
