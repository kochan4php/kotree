// G7: the parts of Windows 95 that should survive a reboot — where each window
// was left, the desktop colour and whether the screensaver is wanted. Kept in
// localStorage, on this device only; private mode simply forgets.

const POSITIONS_KEY = 'kotree-win95-positions';
const DESKTOP_KEY = 'kotree-win95-desktop';
const SCREENSAVER_KEY = 'kotree-win95-screensaver';

export const DESKTOP_COLOURS = [
  { id: 'teal', label: 'Teal', colour: '#008080' },
  { id: 'navy', label: 'Navy', colour: '#000080' },
  { id: 'plum', label: 'Plum', colour: '#4b2e5a' },
  { id: 'slate', label: 'Slate', colour: '#3a6ea5' },
  { id: 'black', label: 'Black', colour: '#14110f' },
] as const;

export type DesktopColour = (typeof DESKTOP_COLOURS)[number]['id'];

export function desktopColourOf(id: DesktopColour): string {
  return DESKTOP_COLOURS.find((entry) => entry.id === id)?.colour ?? '#008080';
}

export function readDesktopColour(): DesktopColour {
  try {
    const stored = localStorage.getItem(DESKTOP_KEY);
    return DESKTOP_COLOURS.some((entry) => entry.id === stored) ? (stored as DesktopColour) : 'teal';
  } catch {
    return 'teal';
  }
}

export function rememberDesktopColour(id: DesktopColour): void {
  try {
    localStorage.setItem(DESKTOP_KEY, id);
  } catch {
    // private mode — the choice lasts the visit
  }
}

export function readScreensaver(): boolean {
  try {
    return localStorage.getItem(SCREENSAVER_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function rememberScreensaver(on: boolean): void {
  try {
    localStorage.setItem(SCREENSAVER_KEY, on ? 'on' : 'off');
  } catch {
    // private mode
  }
}

function readPositions(): Record<string, { x: number; y: number }> {
  try {
    return JSON.parse(localStorage.getItem(POSITIONS_KEY) ?? '{}') as Record<string, { x: number; y: number }>;
  } catch {
    return {};
  }
}

export function rememberWindowPosition(id: string, x: number, y: number): void {
  try {
    const all = readPositions();
    all[id] = { x: Math.round(x), y: Math.round(y) };
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(all));
  } catch {
    // private mode — positions last the visit
  }
}

// A remembered spot may be off-screen after a resize, so restoring one is
// always clamped back into reach.
export function usablePosition(id: string, x: number, y: number): { x: number; y: number } {
  const remembered = readPositions()[id];
  if (!remembered || !Number.isFinite(remembered.x) || !Number.isFinite(remembered.y)) return { x, y };
  return {
    x: Math.min(Math.max(remembered.x, 0), Math.max(0, window.innerWidth - 120)),
    y: Math.min(Math.max(remembered.y, 0), Math.max(0, window.innerHeight - 60)),
  };
}
