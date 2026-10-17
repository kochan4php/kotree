'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowUp,
  BarChart3,
  CornerDownLeft,
  FolderGit2,
  History,
  Link2,
  MessageSquare,
  Moon,
  NotebookPen,
  QrCode,
  Search,
  Settings2,
  Share2,
  Sparkles,
  Terminal,
  Trophy,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { toast } from 'sonner';
import { socialLinks } from '@/data/social-links';
import { trackLinkClick } from '@/lib/track-click';
import { refreshLinkCounts } from '@/hooks/use-link-counts';
import { cycleTheme, readPrefs, writePrefs } from '@/lib/prefs';
import { clientToken } from '@/lib/csrf-client';
import Skeleton from '@/components/ui/skeleton';

interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  group: 'Recent' | 'Links' | 'Go to' | 'Notes' | 'Projects' | 'Actions';
  run: () => void;
}

// K31: search results are grouped, in this order
const GROUP_ORDER = ['Recent', 'Go to', 'Notes', 'Projects', 'Actions', 'Links'] as const;

function groupRank(group: PaletteItem['group']): number {
  const index = GROUP_ORDER.indexOf(group);
  return index === -1 ? GROUP_ORDER.length : index;
}

// K17: the build writes a small index of note/project titles, summaries and
// tags (public/search-index.json); the palette loads it once and searches it
// alongside links, pages and actions.
interface SearchEntry {
  type: 'note' | 'project';
  title: string;
  summary: string;
  tags: string[];
  url: string;
}

let searchIndexPromise: Promise<SearchEntry[]> | null = null;

function loadSearchIndex(): Promise<SearchEntry[]> {
  searchIndexPromise ??= fetch('/search-index.json')
    .then((res) => (res.ok ? res.json() : []))
    .then((data) => (Array.isArray(data) ? (data as SearchEntry[]) : []))
    .catch(() => []);
  return searchIndexPromise;
}

const RECENT_KEY = 'kotree-palette-recent';

function readRecents(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function pushRecent(id: string): void {
  const next = [id, ...readRecents().filter((v) => v !== id)].slice(0, 5);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // private mode — recents just don't persist
  }
}

// Subsequence match with a small score so word starts beat mid-word hits.
function fuzzy(query: string, text: string): { score: number; indices: number[] } | null {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const indices: number[] = [];
  let qi = 0;
  let score = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      indices.push(i);
      if (i === 0 || t[i - 1] === ' ') score += 3;
      if (indices.length > 1 && i === indices[indices.length - 2] + 1) score += 2;
      qi++;
    }
  }
  return qi === q.length ? { score: score - indices[0], indices } : null;
}

function Highlight({ text, indices }: { text: string; indices: number[] }) {
  if (indices.length === 0) return <>{text}</>;
  const set = new Set(indices);
  return (
    <>
      {Array.from(text).map((char, i) =>
        set.has(i) ? (
          <span key={i} className="text-accent-ink font-black">
            {char}
          </span>
        ) : (
          <span key={i}>{char}</span>
        ),
      )}
    </>
  );
}

// Global command palette: link search + page navigation + quick actions.
// Replaces the old homepage-only inline filter; the dock button, Ctrl/⌘+K,
// Escape and the X button all control it.
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useState<string[]>([]);
  const [searchIndex, setSearchIndex] = useState<SearchEntry[]>([]);
  // K39: skeleton under the list while the content index is still loading
  const [indexLoading, setIndexLoading] = useState(false);
  const openRef = useRef(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const openPalette = useCallback(() => {
    // Never stack on top of another dialog (terminal, QR, boss fight…)
    if (document.querySelector('[aria-modal="true"]')) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    setQuery('');
    setActiveIndex(0);
    setRecents(readRecents());
    setIndexLoading(true);
    loadSearchIndex().then((idx) => {
      setSearchIndex(idx);
      setIndexLoading(false);
    });
    setOpen(true);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    openerRef.current?.focus?.();
  }, []);

  useEffect(() => {
    openRef.current = open;
    window.dispatchEvent(new CustomEvent('kotree:search-state', { detail: open }));
  }, [open]);

  // Dock button toggle + Ctrl/⌘+K, both global
  useEffect(() => {
    const onToggle = () => (openRef.current ? closePalette() : openPalette());
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (openRef.current) closePalette();
        else openPalette();
      }
    };
    window.addEventListener('kotree:search', onToggle);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('kotree:search', onToggle);
      window.removeEventListener('keydown', onKey);
    };
  }, [openPalette, closePalette]);

  // Keep the active row in view while arrowing through results
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`#kt-item-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  // K23: SearchAction deep link — /?q=term opens the palette pre-filled
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (!q) return;
    (async () => {
      openPalette();
      setQuery(q);
      // Drop ?q so the back button and reloads stay clean
      window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    })();
  }, [openPalette]);

  if (!open) return null;

  const prefs = readPrefs();

  const openLink = (name: string, url: string) => {
    window.open(url, url.startsWith('mailto:') ? '_self' : '_blank', 'noopener');
    trackLinkClick(name, clientToken());
    if (navigator.onLine) refreshLinkCounts();
  };

  const navItems: PaletteItem[] = (
    [
      ['Changelog', '/changelog', History, 'Every update, newest first'],
      ['Guestbook', '/guestbook', MessageSquare, 'The full confession wall'],
      ['Stats', '/stats', BarChart3, 'Clicks, links, reactions and trends'],
      ['Secrets', '/secrets', Trophy, 'Easter eggs and spoilers'],
      ['Projects', '/projects', FolderGit2, 'Things I have built'],
      ['Notes', '/notes', NotebookPen, 'Short notes, newest first'],
      ['About', '/about', User, 'Who is behind Kotree'],
      ['Now', '/now', Sparkles, 'What I am up to right now'],
    ] as const
  )
    .filter(([, href]) => href !== pathname)
    .map(([label, href, icon, description]) => ({
      id: `nav:${href}`,
      label,
      description,
      icon,
      group: 'Go to' as const,
      run: () => router.push(href),
    }));

  const actionItems: PaletteItem[] = [
    {
      id: 'action:theme',
      label: 'Cycle theme',
      description: 'Auto → light → dark',
      hint: prefs.theme,
      icon: Moon,
      group: 'Actions',
      run: () => toast.info(`Theme: ${cycleTheme()}`),
    },
    {
      id: 'action:prefs',
      label: 'Open preferences',
      description: 'Theme, accent, effects, sound',
      icon: Settings2,
      group: 'Actions',
      run: () => window.dispatchEvent(new Event('kotree:prefs-open')),
    },
    {
      id: 'action:terminal',
      label: 'Open terminal',
      description: 'Type a command or ask the neural net',
      icon: Terminal,
      group: 'Actions',
      run: () => window.dispatchEvent(new Event('kotree:terminal')),
    },
    ...(pathname === '/'
      ? [
          {
            id: 'action:qr',
            label: 'Show QR code',
            description: 'Scan to open this page on your phone',
            icon: QrCode,
            group: 'Actions' as const,
            run: () => window.dispatchEvent(new Event('kotree:qr')),
          },
        ]
      : []),
    {
      id: 'action:copy',
      label: 'Copy page link',
      description: 'Copies this page URL to the clipboard',
      icon: Link2,
      group: 'Actions',
      run: () => {
        navigator.clipboard.writeText(window.location.href).then(
          () => toast.success('Link copied!'),
          () => toast.error('Could not copy — clipboard blocked'),
        );
      },
    },
    {
      id: 'action:share',
      label: 'Share this page',
      description: 'Uses your device share sheet when available',
      icon: Share2,
      group: 'Actions',
      run: () => {
        if (navigator.share) {
          navigator.share({ title: 'Kotree', url: window.location.href }).catch(() => {});
        } else {
          navigator.clipboard.writeText(window.location.href).then(
            () => toast.success('Link copied!'),
            () => toast.error('Could not copy — clipboard blocked'),
          );
        }
      },
    },
    {
      id: 'action:fx',
      label: prefs.fx ? 'Turn background effects off' : 'Turn background effects on',
      description: 'Starfield, ghost cursor, edge fades',
      hint: prefs.fx ? 'on' : 'off',
      icon: Sparkles,
      group: 'Actions',
      run: () => {
        const next = writePrefs({ fx: !readPrefs().fx });
        toast.info(`Background effects: ${next.fx ? 'on' : 'off'}`);
      },
    },
    {
      id: 'action:sound',
      label: prefs.sound ? 'Mute sound effects' : 'Unmute sound effects',
      description: 'Clicks, hovers, successes',
      hint: prefs.sound ? 'on' : 'off',
      icon: prefs.sound ? Volume2 : VolumeX,
      group: 'Actions',
      run: () => {
        const next = writePrefs({ sound: !readPrefs().sound });
        toast.info(`Sound effects: ${next.sound ? 'on' : 'off'}`);
      },
    },
  ];

  const linkItems: PaletteItem[] = socialLinks.map((link) => ({
    id: `link:${link.name.toLowerCase()}`,
    label: link.name,
    description: link.description,
    icon: link.icon,
    group: 'Links' as const,
    run: () => openLink(link.name, link.url),
  }));

  const contentItems: PaletteItem[] = searchIndex.map((entry) => ({
    id: `content:${entry.url}`,
    label: entry.title,
    description: entry.summary,
    hint: entry.type === 'note' ? 'note' : 'project',
    icon: entry.type === 'note' ? NotebookPen : FolderGit2,
    group: entry.type === 'note' ? ('Notes' as const) : ('Projects' as const),
    run: () => router.push(entry.url),
  }));

  const allItems = [...linkItems, ...navItems, ...actionItems, ...contentItems];
  const byId = new Map(allItems.map((item) => [item.id, item]));

  const trimmed = query.trim();
  let shown: PaletteItem[]; // flattened, index-aligned with the listbox
  let scored = new Map<string, number[]>(); // id → highlight indices

  if (trimmed) {
    scored = new Map();
    const matches = allItems
      .map((item) => {
        const labelMatch = fuzzy(trimmed, item.label);
        const descMatch = item.description ? fuzzy(trimmed, item.description) : null;
        if (!labelMatch && !descMatch) return null;
        if (labelMatch) scored.set(item.id, labelMatch.indices);
        return { item, score: labelMatch ? labelMatch.score + 10 : descMatch!.score, labelMatch: Boolean(labelMatch) };
      })
      .filter((m): m is { item: PaletteItem; score: number; labelMatch: boolean } => m !== null)
      // K31: grouped results — name matches always outrank summary matches
      // (a summary that happens to spell the query must not bury the command),
      // then groups order them: pages, notes, projects, actions, links.
      .sort(
        (a, b) =>
          Number(b.labelMatch) - Number(a.labelMatch) ||
          groupRank(a.item.group) - groupRank(b.item.group) ||
          b.score - a.score,
      )
      .slice(0, 9);
    shown = matches.map((m) => m.item);
  } else {
    const recentItems = recents
      .map((id) => byId.get(id))
      .filter((item): item is PaletteItem => Boolean(item))
      .map((item) => ({ ...item, group: 'Recent' as const }));
    shown = [...recentItems, ...navItems, ...actionItems, ...linkItems];
  }

  const clampedIndex = Math.min(activeIndex, Math.max(0, shown.length - 1));

  // K31: groups are labelled in both views — results and the idle list
  const groupHeaderAt = (index: number): string | null =>
    index === 0 || shown[index - 1].group !== shown[index].group ? shown[index].group : null;

  const execute = (item: PaletteItem) => {
    pushRecent(item.id);
    closePalette();
    item.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(shown.length - 1, i + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === 'Enter') {
      // Only the input drives Enter-to-open; buttons below handle their own Enter
      if (e.target !== inputRef.current) return;
      e.preventDefault();
      const item = shown[clampedIndex];
      if (item) execute(item);
    }
  };

  return (
    <div
      id="kt-palette-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Search and commands"
      onKeyDown={onKeyDown}
      className="fixed left-4 right-4 top-[calc(4.75rem+env(safe-area-inset-top))] z-50 mx-auto max-w-md"
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          placeholder="Search links, pages and actions..."
          aria-label="Search links"
          aria-controls="kt-palette-list"
          className="w-full bg-card border-[3px] border-foreground rounded-xl py-3 pl-10 pr-12 text-sm font-bold text-foreground placeholder:text-muted-foreground shadow-[4px_4px_0_0_var(--foreground)] focus:outline-none focus:shadow-[6px_6px_0_0_var(--foreground)] transition-shadow"
        />
        {/* Close affordance: mobile keyboards have no Escape key */}
        <button
          type="button"
          onClick={closePalette}
          aria-label="Close search"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <ul
        ref={listRef}
        id="kt-palette-list"
        aria-label="Results"
        className="mt-2 max-h-[min(60vh,26rem)] overflow-y-auto rounded-xl border-[3px] border-foreground bg-card shadow-[4px_4px_0_0_var(--foreground)]"
      >
        {shown.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            Nothing found for &quot;{trimmed}&quot;
          </li>
        )}
        {shown.map((item, i) => {
          const header = groupHeaderAt(i);
          const Icon = item.icon;
          return (
            <li key={item.id}>
              {header && (
                <div data-group={header} className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {header}
                </div>
              )}
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => execute(item)}
                aria-current={i === clampedIndex ? 'true' : undefined}
                className={`w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer border-t-2 border-foreground/10 first:border-t-0 text-left ${
                  i === clampedIndex ? 'bg-accent text-accent-foreground' : ''
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold truncate">
                    <Highlight text={item.label} indices={scored.get(item.id) ?? []} />
                  </span>
                  {item.description && (
                    <span
                      className={`block text-xs truncate ${
                        i === clampedIndex ? 'text-accent-foreground/80' : 'text-muted-foreground'
                      }`}
                    >
                      {item.description}
                    </span>
                  )}
                </span>
                {item.hint && (
                  <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
                    {item.hint}
                  </span>
                )}
                {i === clampedIndex && <CornerDownLeft className="w-3.5 h-3.5 shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>

      {indexLoading && trimmed && searchIndex.length === 0 && (
        <div className="mt-2 rounded-xl border-[3px] border-foreground bg-card p-3 shadow-[4px_4px_0_0_var(--foreground)]">
          <Skeleton rows={2} />
        </div>
      )}

      <div className="mt-2 flex items-center justify-center gap-3 text-[10px] font-bold text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ArrowUp className="w-3 h-3" />
          <ArrowUp className="w-3 h-3 rotate-180" />
          navigate
        </span>
        <span className="inline-flex items-center gap-1">
          <CornerDownLeft className="w-3 h-3" /> open
        </span>
        <span>Esc close</span>
      </div>
    </div>
  );
}
