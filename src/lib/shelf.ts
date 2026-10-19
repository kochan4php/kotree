import { get, set } from 'idb-keyval';

// G2: the reading shelf — saved pages, reading progress and highlights, kept
// on this device only.
// shortcut: one key, last write wins. Two tabs racing costs at most one click
// on a personal shelf; upgrade to per-key records if the shelf ever syncs.
const KEY = 'kotree-shelf';

export interface SavedPage {
  path: string;
  title: string;
}

export interface ReadPage extends SavedPage {
  /** When it was last opened. */
  at: string;
  /** Highest percentage of the page seen, 0–100. */
  progress: number;
}

export interface StoredHighlight {
  path: string;
  title: string;
  text: string;
  before: string;
  after: string;
  /** Milliseconds as an ISO string — unique enough to remove one highlight. */
  at: string;
}

export interface Shelf {
  saved: SavedPage[];
  read: ReadPage[];
  highlights: StoredHighlight[];
}

const EMPTY: Shelf = { saved: [], read: [], highlights: [] };

export async function readShelf(): Promise<Shelf> {
  try {
    const stored = (await get(KEY)) as Partial<Shelf> | undefined;
    return {
      saved: stored?.saved ?? [],
      read: stored?.read ?? [],
      highlights: stored?.highlights ?? [],
    };
  } catch {
    return EMPTY; // private mode: the shelf is simply empty
  }
}

async function update(change: (shelf: Shelf) => Shelf): Promise<Shelf> {
  const next = change(await readShelf());
  try {
    await set(KEY, next);
  } catch {
    // Private mode again — the UI reflects the click, the reload will not.
  }
  return next;
}

export function toggleSaved(path: string, title: string): Promise<Shelf> {
  return update((shelf) =>
    shelf.saved.some((page) => page.path === path)
      ? { ...shelf, saved: shelf.saved.filter((page) => page.path !== path) }
      : { ...shelf, saved: [{ path, title }, ...shelf.saved] }
  );
}

// Progress only ever grows: a later skim must not erase how far you once got.
export function recordRead(path: string, title: string, progress: number): Promise<Shelf> {
  return update((shelf) => {
    const previous = shelf.read.find((page) => page.path === path);
    const entry: ReadPage = {
      path,
      title,
      at: new Date().toISOString(),
      progress: Math.max(progress, previous?.progress ?? 0),
    };
    return { ...shelf, read: [entry, ...shelf.read.filter((page) => page.path !== path)] };
  });
}

export function forgetRead(path: string): Promise<Shelf> {
  return update((shelf) => ({
    ...shelf,
    read: shelf.read.filter((page) => page.path !== path),
  }));
}

export function addHighlight(highlight: StoredHighlight): Promise<Shelf> {
  return update((shelf) => ({ ...shelf, highlights: [highlight, ...shelf.highlights] }));
}

export function removeHighlight(at: string): Promise<Shelf> {
  return update((shelf) => ({
    ...shelf,
    highlights: shelf.highlights.filter((highlight) => highlight.at !== at),
  }));
}
