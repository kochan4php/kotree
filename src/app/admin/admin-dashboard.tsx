'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import Skeleton from '@/components/ui/skeleton';
import { toast } from '@/lib/toast';
import { Ban, BarChart3, Bug, Check, Download, Eye, EyeOff, FileDown, Gauge, LogOut, Pin, PinOff, RefreshCw, Reply, ScrollText, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { decryptMessage } from '@/components/guestbook/obfuscation';
import InlineMarkdown from '@/components/content/inline-markdown';

interface Overview {
  totalClicks: number;
  links: { name: string; count: number }[];
  guestbook: {
    id: string;
    message: string;
    createdAt: string;
    userAgent?: string;
    pinned?: boolean;
    reports?: number;
    hidden?: boolean;
    ipHash?: string;
    reply?: { message: string; at: string };
    editedAt?: string;
    deleted?: boolean;
    history?: { message: string; at: string }[];
    // H4: why a post was held for review
    spam?: { score: number; reasons: string[] };
  }[];
  daily: { day: string; count: number }[];
  errors: { id: string; message: string; source: string; url?: string; count: number; createdAt: string; lastSeenAt?: string }[];
  vitals: { page: string; metric: string; p75: number; rating: 'good' | 'ni' | 'poor'; good: number; total: number; weeks?: (number | null)[] }[];
  pageviews: { path: string; count: number }[];
  audit: { id: string; event: string; detail?: string; at: string }[];
  // M67: action types for the audit filter
  auditEvents?: string[];
  // M65: the sharpest slice of the client-error stream
  csp?: { message: string; count: number; lastSeenAt: string }[];
  // M44: the active poll, if one is running
  poll?: { id: string; question: string; options: { label: string; count: number }[]; total: number } | null;
  // H8: the number of failed sign-ins in the last day, when it crossed the
  // alert threshold; null when things are quiet
  loginAlert?: number | null;
}

// M61: one row in the sessions registry (ids arrive truncated)
interface SessionRow {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  bound: boolean;
  current: boolean;
}

// M10: tiny four-week p75 sparkline. For every vital a lower number is better,
// so a falling line is green and a rising one red.
function VitalsTrend({ weeks, metric }: { weeks: (number | null)[]; metric: string }) {
  const known = weeks.filter((week): week is number => week !== null);
  if (known.length < 2) return <span className="font-mono text-muted-foreground">—</span>;
  const min = Math.min(...known);
  const span = Math.max(...known) - min || 1;
  const points = weeks
    .map((week, index) => `${index * 12},${18 - (((week ?? min) - min) / span) * 14}`)
    .join(' ');
  const newest = weeks[weeks.length - 1];
  const improved = newest !== null && newest <= known[0];
  const label = weeks
    .map((week) => (week === null ? '—' : metric === 'CLS' ? week.toFixed(3) : `${Math.round(week)}ms`))
    .join(' → ');
  return (
    <span className="inline-flex items-center gap-1" title={label}>
      <svg viewBox="0 0 36 20" width="36" height="20" aria-hidden="true">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={improved ? 'text-green-700' : 'text-red-600'}
        />
      </svg>
      <span className={`font-mono text-[10px] font-bold ${improved ? 'text-green-700' : 'text-red-600'}`} aria-hidden="true">
        {improved ? '↓' : '↑'}
      </span>
      <span className="sr-only">
        {improved ? 'trending down' : 'trending up'} over four weeks: {label}
      </span>
    </span>
  );
}

const iconButton =
  'inline-flex items-center justify-center w-9 h-9 rounded-lg border-2 border-foreground bg-card text-foreground shadow-[2px_2px_0_0_var(--foreground)] hover:bg-accent hover:text-accent-foreground active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all';

// Reads the non-HttpOnly CSRF cookie set at login; echoed back in the
// x-csrf-token header on every cookie-authenticated mutation (double submit).
function readCsrfCookie(): string {
  for (const part of document.cookie.split(';')) {
    const eq = part.indexOf('=');
    if (eq !== -1 && part.slice(0, eq).trim() === 'kotree-csrf') return part.slice(eq + 1);
  }
  return '';
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Hand-rolled SVG trend line (no chart library, per the no-dependency rule)
function TrendChart({ data }: { data: { day: string; count: number }[] }) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground italic">No click data yet.</p>;
  const max = Math.max(1, ...data.map((d) => d.count));
  const W = 640;
  const H = 140;
  const pad = 6;
  const step = data.length > 1 ? (W - pad * 2) / (data.length - 1) : 0;
  const x = (i: number) => pad + i * step;
  const y = (count: number) => H - pad - (count / max) * (H - pad * 2);
  const points = data.map((d, i) => `${x(i).toFixed(1)},${y(d.count).toFixed(1)}`).join(' ');
  const area = `${pad},${H - pad} ${points} ${(W - pad).toFixed(1)},${H - pad}`;
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-1.5">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Daily clicks over the last ${data.length} days: ${total} total, peak ${max} in one day`}
      >
        <polygon points={area} fill="var(--accent, #ff7c47)" opacity="0.22" />
        <polyline
          points={points}
          fill="none"
          stroke="var(--accent, #ff7c47)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((d, i) => (
          <circle
            key={d.day}
            cx={x(i)}
            cy={y(d.count)}
            r={d.count === max && d.count > 0 ? 5 : 3}
            fill="var(--foreground, #14110f)"
            stroke="var(--card, #fff)"
            strokeWidth="1.5"
          />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] font-mono font-bold text-muted-foreground">
        <span>{data[0].day}</span>
        <span>today: {data[data.length - 1].count}</span>
        <span>{data[data.length - 1].day}</span>
      </div>
    </div>
  );
}

// M27: a panel-shaped placeholder so each half of the dashboard can render
// the moment its data lands instead of waiting for the slowest query.
function SectionSkeleton({ label }: { label: string }) {
  return (
    <Card className="fluid-glass">
      <div className="relative z-10 space-y-3">
        <h2 className="sr-only">{label}</h2>
        <Skeleton rows={4} />
      </div>
    </Card>
  );
}

export default function AdminDashboard() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [probeDone, setProbeDone] = useState(false);
  const [filter, setFilter] = useState('');
  // M47: report queue — reported first, hidden-only, or everything
  const [modFilter, setModFilter] = useState<'all' | 'reported' | 'hidden'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // M47: decrypted, markdown-lite preview for one entry at a time
  const [previewId, setPreviewId] = useState<string | null>(null);
  // M43: which entry's reply box is open, and its draft text
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  // M44: poll draft
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState('');
  const [pollBusy, setPollBusy] = useState(false);
  // M60: the second factor — only surfaced when the server asks for it
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState('');
  // M61: the revocable session registry
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  // M67: audit filter — a fetched view wins over the overview's first page
  const [auditEvent, setAuditEvent] = useState('all');
  const [auditView, setAuditView] = useState<{ entries: Overview['audit']; events: string[] } | null>(null);

  // A session cookie may still be live from a previous visit: try it silently
  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/overview')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setOverview(data as Overview);
        setAuthed(true);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setProbeDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Cookie-authenticated: no token ever travels from the client.
  // M27: the two halves load in parallel and each one lands in its own
  // panels — a slow moderation query no longer blocks the click stats.
  const refresh = useCallback(async () => {
    setIsLoading(true);
    const loadPart = async (section: 'stats' | 'moderation') => {
      const res = await fetch(`/api/admin/overview?section=${section}`);
      if (res.status === 503) throw new Error('Admin is not configured — set ADMIN_TOKEN in the environment.');
      if (res.status === 401) throw new Error('Session expired — sign in again.');
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const part = (await res.json()) as Partial<Overview>;
      setOverview((prev) => ({ ...(prev ?? {}), ...part }) as Overview);
      setAuthed(true);
    };
    try {
      await Promise.all([loadPart('stats'), loadPart('moderation')]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load');
      setAuthed(false);
      setOverview(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim() || isLoading) return;
    setIsLoading(true);
    try {
      // Exchange the token (+ 2FA code, when on) for an HttpOnly session (R6/M60)
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), code: code.trim() }),
      });
      if (res.status === 503) throw new Error('Admin is not configured — set ADMIN_TOKEN in the environment.');
      if (res.status === 429) throw new Error('Too many attempts — wait a minute and try again.');
      if (res.status === 401) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (data?.error === 'totp_required') {
          setNeedsCode(true);
          throw new Error('Enter the 2FA code to continue.');
        }
        if (data?.error === 'totp_invalid') throw new Error('Invalid 2FA code.');
        throw new Error('Wrong token.');
      }
      if (!res.ok) throw new Error(`Failed to sign in (${res.status})`);
      setToken('');
      setCode('');
      setNeedsCode(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sign in');
      setAuthed(false);
      setOverview(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear the UI immediately, drop the server session in the background
    void fetch('/api/admin/session', {
      method: 'DELETE',
      headers: { 'x-csrf-token': readCsrfCookie() },
    }).catch(() => {});
    setToken('');
    setAuthed(false);
    setOverview(null);
  };

  // M61: the registry follows the sign-in state
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sessions');
      if (!res.ok) throw new Error(`Failed to load sessions (${res.status})`);
      const data = (await res.json()) as { sessions: SessionRow[] };
      setSessions(data.sessions);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load sessions');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loadSessions awaits the fetch before setState
    if (authed) void loadSessions();
  }, [authed, loadSessions]);

  const revokeSession = async (row: SessionRow) => {
    try {
      const res = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': readCsrfCookie() },
        body: JSON.stringify({ id: row.id }),
      });
      if (!res.ok) throw new Error(`Revoke failed (${res.status})`);
      if (row.current) {
        // Revoking yourself is a logout with extra steps
        toast.success('Session revoked — signing out');
        setAuthed(false);
        setOverview(null);
        return;
      }
      toast.success('Session revoked');
      setSessions((prev) => (prev ? prev.filter((session) => session.id !== row.id) : prev));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Revoke failed');
    }
  };

  // M67: filtered audit pages + the CSV download
  const loadAudit = useCallback(async (event: string) => {
    try {
      const suffix = event && event !== 'all' ? `?event=${encodeURIComponent(event)}` : '';
      const res = await fetch(`/api/admin/audit${suffix}`);
      if (!res.ok) throw new Error(`Failed to load audit (${res.status})`);
      setAuditView((await res.json()) as { entries: Overview['audit']; events: string[] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load audit');
    }
  }, []);

  const exportAuditCsv = async () => {
    try {
      const suffix = auditEvent && auditEvent !== 'all' ? `&event=${encodeURIComponent(auditEvent)}` : '';
      const res = await fetch(`/api/admin/audit?format=csv${suffix}`);
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      downloadBlob(await res.blob(), 'kotree-audit.csv');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const removeEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/guestbook?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': readCsrfCookie() },
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setOverview((prev) => (prev ? { ...prev, guestbook: prev.guestbook.filter((entry) => entry.id !== id) } : prev));
      toast.success('Entry deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // K30: feature an entry on the wall (or take it down again)
  const togglePin = async (id: string, pinned: boolean) => {
    try {
      const res = await fetch('/api/admin/guestbook', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': readCsrfCookie() },
        body: JSON.stringify({ id, pinned }),
      });
      if (!res.ok) throw new Error(`Pin failed (${res.status})`);
      setOverview((prev) =>
        prev ? { ...prev, guestbook: prev.guestbook.map((entry) => (entry.id === id ? { ...entry, pinned } : entry)) } : prev,
      );
      toast.success(pinned ? 'Entry pinned to the top' : 'Entry unpinned');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Pin failed');
    }
  };

  // M47: hide / unhide — one entry or the whole bulk selection
  const setHidden = async (ids: string[], hidden: boolean) => {
    try {
      const res = await fetch('/api/admin/guestbook', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': readCsrfCookie() },
        body: JSON.stringify({ ids, hidden }),
      });
      if (!res.ok) throw new Error(`Update failed (${res.status})`);
      const idSet = new Set(ids);
      setOverview((prev) =>
        prev ? { ...prev, guestbook: prev.guestbook.map((entry) => (idSet.has(entry.id) ? { ...entry, hidden } : entry)) } : prev,
      );
      setSelected(new Set());
      toast.success(hidden ? 'Hidden from the wall' : 'Visible again');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // M43: send (or clear) a reply under an entry
  const sendReply = async (id: string) => {
    try {
      const res = await fetch('/api/admin/guestbook', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': readCsrfCookie() },
        body: JSON.stringify({ id, reply: replyText }),
      });
      if (!res.ok) throw new Error(`Reply failed (${res.status})`);
      const trimmed = replyText.trim();
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              guestbook: prev.guestbook.map((entry) =>
                entry.id === id ? { ...entry, reply: trimmed ? { message: trimmed, at: new Date().toISOString() } : undefined } : entry,
              ),
            }
          : prev,
      );
      setReplyId(null);
      setReplyText('');
      toast.success(trimmed ? 'Reply posted' : 'Reply cleared');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reply failed');
    }
  };

  // M47: temporary 24h ban keyed on the hashed IP (it expires on its own)
  const setBan = async (ipHash: string) => {
    try {
      const res = await fetch('/api/admin/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': readCsrfCookie() },
        body: JSON.stringify({ ipHash, action: 'ban' }),
      });
      if (!res.ok) throw new Error(`Ban failed (${res.status})`);
      toast.success('Banned for 24 hours');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ban failed');
    }
  };

  // M44: start the next question (this closes the previous one)
  const createPoll = async () => {
    if (pollBusy) return;
    setPollBusy(true);
    try {
      const options = pollOptions.split(',').map((option) => option.trim()).filter(Boolean);
      const res = await fetch('/api/admin/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': readCsrfCookie() },
        body: JSON.stringify({ question: pollQuestion, options }),
      });
      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      toast.success('Question is live');
      setPollQuestion('');
      setPollOptions('');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setPollBusy(false);
    }
  };

  const closePoll = async () => {
    if (pollBusy) return;
    setPollBusy(true);
    try {
      const res = await fetch('/api/admin/poll', {
        method: 'DELETE',
        headers: { 'x-csrf-token': readCsrfCookie() },
      });
      if (!res.ok) throw new Error(`Close failed (${res.status})`);
      toast.success('Poll closed');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Close failed');
    } finally {
      setPollBusy(false);
    }
  };

  // K7: hide an error report once it is fixed
  const resolveError = async (id: string) => {
    try {
      const res = await fetch('/api/admin/errors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': readCsrfCookie() },
        body: JSON.stringify({ id, resolved: true }),
      });
      if (!res.ok) throw new Error(`Resolve failed (${res.status})`);
      setOverview((prev) => (prev ? { ...prev, errors: prev.errors.filter((entry) => entry.id !== id) } : prev));
      toast.success('Error marked as resolved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Resolve failed');
    }
  };

  const exportCsv = () => {
    if (!overview?.guestbook) return;
    const rows = [
      ['id', 'createdAt', 'message', 'userAgent'],
      ...overview.guestbook.map((entry) => [entry.id, entry.createdAt, entry.message, entry.userAgent ?? '']),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'kotree-guestbook.csv');
  };

  const exportJson = async () => {
    try {
      const res = await fetch('/api/admin/export');
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      downloadBlob(await res.blob(), `kotree-backup-${new Date().toISOString().slice(0, 10)}.json`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const maxCount = Math.max(1, ...(overview?.links?.map((link) => link.count) ?? []));
  const maxPageviews = Math.max(1, ...(overview?.pageviews?.map((page) => page.count) ?? []));
  const maxCsp = Math.max(1, ...(overview?.csp?.map((violation) => violation.count) ?? []));
  // M67: the fetched (filtered) view wins over the overview's first page
  const auditEntries = auditView?.entries ?? overview?.audit ?? [];
  const query = filter.trim().toLowerCase();
  const filteredEntries = (overview?.guestbook ?? [])
    .filter((entry) => !query || entry.message.toLowerCase().includes(query))
    .filter((entry) => {
      // M47: moderation queue — reported first, or hidden only
      if (modFilter === 'reported') return (entry.reports ?? 0) > 0;
      if (modFilter === 'hidden') return Boolean(entry.hidden);
      return true;
    })
    .sort((a, b) => (modFilter === 'reported' ? (b.reports ?? 0) - (a.reports ?? 0) : 0));

  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <div className="relative max-w-2xl md:max-w-3xl mx-auto space-y-3">
        <Card className="fluid-glass">
          <div className="liquid-gradient"></div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-accent-ink" />
              <h1 className="text-xl font-black tracking-tight text-foreground">Admin</h1>
            </div>

            {!probeDone ? null : !authed ? (
              <form onSubmit={handleConnect} className="space-y-2">
                <div className="flex gap-2">
                  <label htmlFor="admin-token" className="sr-only">
                    Admin token
                  </label>
                  <input
                    id="admin-token"
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Admin token"
                    autoComplete="current-password"
                    className="flex-1 rounded-lg border-[3px] border-foreground bg-card px-3 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground shadow-[2px_2px_0_0_var(--foreground)] focus:outline-none focus:shadow-[4px_4px_0_0_var(--foreground)] transition-shadow"
                  />
                  <button
                    type="submit"
                    disabled={!token.trim() || isLoading || (needsCode && !code.trim())}
                    className="rounded-lg bg-accent border-[3px] border-foreground px-4 py-2 text-sm font-bold text-accent-foreground shadow-[3px_3px_0_0_var(--foreground)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isLoading ? 'Checking…' : 'Connect'}
                  </button>
                </div>
                {needsCode && (
                  <div>
                    <label htmlFor="admin-code" className="sr-only">
                      2FA code
                    </label>
                    <input
                      id="admin-code"
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="2FA code"
                      autoComplete="one-time-code"
                      inputMode="text"
                      className="w-full rounded-lg border-[3px] border-foreground bg-card px-3 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground shadow-[2px_2px_0_0_var(--foreground)] focus:outline-none focus:shadow-[4px_4px_0_0_var(--foreground)] transition-shadow"
                    />
                    <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                      Two-factor is on — enter the code from your authenticator, or a recovery code.
                    </p>
                  </div>
                )}
              </form>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground font-medium">Connected.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={exportJson}
                    aria-label="Export JSON backup"
                    title="Export JSON backup"
                    className={iconButton}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={refresh} disabled={isLoading} aria-label="Refresh data" className={iconButton}>
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={logout} aria-label="Log out" className={iconButton}>
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {authed && overview?.loginAlert && (
          <div
            role="alert"
            className="rounded-lg border-[3px] border-foreground bg-amber-300 px-4 py-3 shadow-[4px_4px_0_0_var(--foreground)]"
          >
            <p className="text-sm font-black uppercase tracking-wide text-[#14110f]">
              {overview.loginAlert} failed sign-ins in the last 24 hours
            </p>
            <p className="mt-1 text-xs font-medium text-[#14110f]">
              If that was not you, change ADMIN_TOKEN and the recovery codes, then revoke the sessions below.
            </p>
          </div>
        )}

        {authed && overview?.links === undefined && <SectionSkeleton label="Loading click stats" />}
        {authed && overview?.links !== undefined && (
          <>
            <Card className="fluid-glass">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-accent-ink" />
                    <h2 className="text-lg font-bold text-foreground">Clicks by link</h2>
                  </div>
                  <span className="rounded-full bg-foreground text-background font-mono text-xs font-bold px-3 py-1 border-2 border-foreground">
                    {overview.totalClicks} total
                  </span>
                </div>

                {overview.links.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No clicks recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {overview.links.map((link) => (
                      <div key={link.name} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-xs font-bold uppercase tracking-wide text-foreground truncate">
                          {link.name}
                        </span>
                        <div className="flex-1 h-4 rounded border-2 border-foreground bg-secondary overflow-hidden">
                          <div
                            className="h-full bg-accent"
                            style={{ width: `${Math.max(3, (link.count / maxCount) * 100)}%` }}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-right text-xs font-mono font-bold text-foreground">{link.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card className="fluid-glass">
              <div className="relative z-10 space-y-3">
                <h2 className="text-lg font-bold text-foreground">Daily clicks (14 days)</h2>
                <TrendChart data={overview.daily ?? []} />
              </div>
            </Card>

            <Card className="fluid-glass">
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-accent-ink" />
                  <h2 className="text-lg font-bold text-foreground">Web vitals (p75, 7 days)</h2>
                </div>
                {(overview.vitals ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No vitals recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          <th className="py-1 pr-2 font-bold">Page</th>
                          <th className="py-1 pr-2 font-bold">Metric</th>
                          <th className="py-1 pr-2 font-bold">p75</th>
                          <th className="py-1 pr-2 font-bold">Rating</th>
                          <th className="py-1 pr-2 font-bold">30d trend</th>
                          <th className="py-1 font-bold">Samples</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(overview.vitals ?? []).map((vital) => (
                          <tr key={`${vital.page}:${vital.metric}`} className="border-t-2 border-dashed border-foreground/20">
                            <td className="py-1.5 pr-2 font-mono text-foreground">{vital.page}</td>
                            <td className="py-1.5 pr-2 font-bold text-foreground">{vital.metric}</td>
                            <td className="py-1.5 pr-2 font-mono text-foreground">
                              {vital.metric === 'CLS' ? vital.p75.toFixed(3) : `${vital.p75} ms`}
                            </td>
                            <td className="py-1.5 pr-2">
                              <span
                                className={`inline-block rounded border-2 border-foreground px-1.5 text-[10px] font-black uppercase text-[#14110f] ${
                                  vital.rating === 'good' ? 'bg-green-300' : vital.rating === 'ni' ? 'bg-amber-300' : 'bg-red-300'
                                }`}
                              >
                                {vital.rating}
                              </span>
                            </td>
                            <td className="py-1.5 pr-2">
                              <VitalsTrend weeks={vital.weeks ?? []} metric={vital.metric} />
                            </td>
                            <td className="py-1.5 font-mono text-muted-foreground">
                              {vital.good}/{vital.total} good
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>

            <Card className="fluid-glass">
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-accent-ink" />
                  <h2 className="text-lg font-bold text-foreground">Pageviews (7 days)</h2>
                </div>
                {(overview.pageviews ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No pageviews recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {(overview.pageviews ?? []).map((page) => (
                      <div key={page.path} className="flex items-center gap-3">
                        <span className="w-40 shrink-0 truncate font-mono text-xs font-bold text-foreground" title={page.path}>
                          {page.path}
                        </span>
                        <div className="flex-1 h-4 rounded border-2 border-foreground bg-secondary overflow-hidden">
                          <div
                            className="h-full bg-accent"
                            style={{ width: `${Math.max(3, (page.count / maxPageviews) * 100)}%` }}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-right text-xs font-mono font-bold text-foreground">{page.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card className="fluid-glass">
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2">
                  <Bug className="w-5 h-5 text-accent-ink" />
                  <h2 className="text-lg font-bold text-foreground">CSP violations (top 5)</h2>
                </div>
                {(overview.csp ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nothing blocked lately — the policy is quiet.</p>
                ) : (
                  <div className="space-y-2">
                    {(overview.csp ?? []).map((violation) => (
                      <div key={violation.message} className="flex items-center gap-3">
                        <span
                          className="w-40 shrink-0 truncate font-mono text-xs font-bold text-foreground"
                          title={violation.message}
                        >
                          {violation.message}
                        </span>
                        <div className="flex-1 h-4 rounded border-2 border-foreground bg-secondary overflow-hidden">
                          <div
                            className="h-full bg-accent"
                            style={{ width: `${Math.max(3, (violation.count / maxCsp) * 100)}%` }}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-right text-xs font-mono font-bold text-foreground">
                          {violation.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </>
        )}

        {authed && overview?.guestbook === undefined && <SectionSkeleton label="Loading moderation panels" />}
        {authed && overview?.guestbook !== undefined && (
          <>
            <Card className="fluid-glass">
              <div className="relative z-10 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <ScrollText className="w-5 h-5 text-accent-ink" />
                  <h2 className="text-lg font-bold text-foreground">Audit log</h2>
                  <label htmlFor="audit-event" className="sr-only">
                    Filter by action
                  </label>
                  <select
                    id="audit-event"
                    value={auditEvent}
                    onChange={(e) => {
                      setAuditEvent(e.target.value);
                      void loadAudit(e.target.value);
                    }}
                    className="rounded-lg border-2 border-foreground bg-card px-2 py-1 text-xs font-bold text-foreground shadow-[2px_2px_0_0_var(--foreground)] focus:outline-none"
                  >
                    <option value="all">All actions</option>
                    {(auditView?.events ?? overview.auditEvents ?? []).map((event) => (
                      <option key={event} value={event}>
                        {event.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={exportAuditCsv}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg border-2 border-foreground bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-[2px_2px_0_0_var(--foreground)] hover:bg-accent hover:text-accent-foreground active:translate-y-0.5 active:shadow-none transition-all"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    Export audit CSV
                  </button>
                </div>
                {auditEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No activity recorded yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {auditEntries.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-foreground bg-secondary px-3 py-1.5 shadow-[2px_2px_0_0_var(--foreground)]"
                      >
                        <span
                          className={`inline-block rounded border-2 border-foreground px-1.5 text-[10px] font-black uppercase ${
                            entry.event === 'login_failed' || entry.event === 'login_totp_failed'
                              ? 'bg-red-300 text-[#14110f]'
                              : entry.event === 'login_ok'
                                ? 'bg-green-300 text-[#14110f]'
                                : 'bg-secondary text-foreground'
                          }`}
                        >
                          {entry.event.replace(/_/g, ' ')}
                        </span>
                        {entry.detail &&
                          (/^[a-f0-9]{24}$/.test(entry.detail) ? (
                            // M67: entry ids jump straight to the moderation row
                            <a
                              href={`#gb-${entry.detail}`}
                              className="font-mono text-[10px] font-bold text-accent-ink underline decoration-dotted"
                            >
                              {entry.detail}
                            </a>
                          ) : (
                            <span className="font-mono text-[10px] text-muted-foreground">{entry.detail}</span>
                          ))}
                        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                          {new Date(entry.at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>

            <Card className="fluid-glass">
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-accent-ink" />
                    <h2 className="text-lg font-bold text-foreground">Active sessions</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadSessions()}
                    aria-label="Refresh sessions"
                    className={iconButton}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                {sessions === null ? (
                  <p className="text-sm text-muted-foreground italic">Loading sessions…</p>
                ) : sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No browser sessions — signed in with a token only.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {sessions.map((row) => (
                      <li
                        key={row.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-foreground bg-secondary px-3 py-1.5 shadow-[2px_2px_0_0_var(--foreground)]"
                      >
                        <span className="font-mono text-[10px] font-bold text-foreground">{row.id}…</span>
                        {row.current && (
                          <span className="inline-block rounded border-2 border-foreground bg-green-300 px-1.5 text-[10px] font-black uppercase text-[#14110f]">
                            this device
                          </span>
                        )}
                        {row.bound && (
                          <span className="inline-block rounded border-2 border-foreground bg-card px-1.5 text-[10px] font-black uppercase text-foreground">
                            browser-bound
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-muted-foreground">
                          seen {new Date(row.lastSeenAt).toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => void revokeSession(row)}
                          className="ml-auto rounded-lg border-2 border-foreground bg-card px-2 py-0.5 text-[11px] font-bold text-foreground shadow-[2px_2px_0_0_var(--foreground)] hover:bg-accent hover:text-accent-foreground active:translate-y-0.5 active:shadow-none transition-all"
                        >
                          Revoke
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>

            <Card className="fluid-glass">
              <div className="relative z-10 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-foreground">Guestbook moderation</h2>
                  <button
                    type="button"
                    onClick={exportCsv}
                    className="inline-flex items-center gap-1.5 rounded-lg border-2 border-foreground bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-[2px_2px_0_0_var(--foreground)] hover:bg-accent hover:text-accent-foreground active:translate-y-0.5 active:shadow-none transition-all"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                </div>

                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter entries…"
                    aria-label="Filter guestbook"
                    className="w-full rounded-lg border-2 border-foreground bg-card pl-9 pr-3 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:shadow-[2px_2px_0_0_var(--foreground)] transition-shadow"
                  />
                </div>

                {/* M47: queue chips + bulk actions */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {([['all', 'All'], ['reported', 'Reported'], ['hidden', 'Hidden']] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setModFilter(value)}
                      aria-pressed={modFilter === value}
                      className={`rounded-lg border-2 border-foreground px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0_0_var(--foreground)] transition-all cursor-pointer active:translate-y-0.5 active:shadow-none ${
                        modFilter === value ? 'bg-accent text-accent-foreground' : 'bg-card text-foreground hover:bg-secondary'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  {selected.size > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setHidden([...selected], true)}
                        className="rounded-lg border-2 border-foreground bg-red-300 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#14110f] shadow-[2px_2px_0_0_var(--foreground)] cursor-pointer active:translate-y-0.5 active:shadow-none"
                      >
                        Hide selected ({selected.size})
                      </button>
                      <button
                        type="button"
                        onClick={() => setHidden([...selected], false)}
                        className="rounded-lg border-2 border-foreground bg-card px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-foreground shadow-[2px_2px_0_0_var(--foreground)] cursor-pointer active:translate-y-0.5 active:shadow-none"
                      >
                        Unhide selected ({selected.size})
                      </button>
                    </>
                  )}
                </div>

                {overview.guestbook.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No entries yet.</p>
                ) : filteredEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    {query ? `No entries match “${filter.trim()}”.` : 'Nothing in this queue.'}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {filteredEntries.map((entry) => (
                      <li
                        key={entry.id}
                        id={`gb-${entry.id}`}
                        className="flex items-start gap-3 rounded-lg border-2 border-foreground bg-secondary p-3 shadow-[2px_2px_0_0_var(--foreground)] target:ring-4 target:ring-accent"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(entry.id)}
                          onChange={() => toggleSelected(entry.id)}
                          aria-label="Select entry"
                          className="mt-1 w-4 h-4 shrink-0 cursor-pointer accent-[var(--accent)]"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <p
                            className={`text-xs font-mono break-all ${
                              entry.deleted ? 'line-through text-muted-foreground' : 'text-foreground'
                            }`}
                          >
                            {previewId === entry.id ? <InlineMarkdown text={decryptMessage(entry.message)} /> : entry.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-medium">
                            {new Date(entry.createdAt).toLocaleString()}
                            {entry.userAgent ? ` · ${entry.userAgent.slice(0, 60)}` : ''}
                            {entry.ipHash ? ` · ip ${entry.ipHash.slice(0, 8)}…` : ''}
                          </p>
                          {(entry.pinned || entry.hidden || entry.deleted || entry.editedAt || entry.spam || (entry.reports ?? 0) > 0 || entry.reply) && (
                            <p className="flex flex-wrap items-center gap-1.5">
                              {entry.pinned && (
                                <span className="inline-block rounded border-2 border-foreground bg-yellow-200 px-1.5 text-[10px] font-black uppercase text-[#14110f]">
                                  pinned
                                </span>
                              )}
                              {entry.hidden && (
                                <span className="inline-block rounded border-2 border-foreground bg-red-300 px-1.5 text-[10px] font-black uppercase text-[#14110f]">
                                  hidden
                                </span>
                              )}
                              {entry.spam && (
                                <span
                                  title={entry.spam.reasons.join('; ')}
                                  className="inline-block rounded border-2 border-foreground bg-orange-300 px-1.5 text-[10px] font-black uppercase text-[#14110f]"
                                >
                                  held: spam {entry.spam.score}
                                </span>
                              )}
                              {entry.deleted && (
                                <span className="inline-block rounded border-2 border-foreground bg-red-200 px-1.5 text-[10px] font-black uppercase text-[#14110f]">
                                  deleted
                                </span>
                              )}
                              {entry.editedAt && (
                                <span className="inline-block rounded border-2 border-foreground bg-secondary px-1.5 text-[10px] font-black uppercase text-foreground">
                                  edited{entry.history?.length ? ` ×${entry.history.length}` : ''}
                                </span>
                              )}
                              {(entry.reports ?? 0) > 0 && (
                                <span className="font-mono text-[10px] font-bold text-destructive">
                                  {entry.reports} report{entry.reports === 1 ? '' : 's'}
                                </span>
                              )}
                              {entry.reply && <span className="font-mono text-[10px] font-bold text-accent-ink">replied</span>}
                            </p>
                          )}
                          {entry.reply && previewId !== entry.id && (
                            <p className="border-l-2 border-accent-ink pl-2 text-[11px] text-foreground/90">
                              <InlineMarkdown text={entry.reply.message} />
                            </p>
                          )}
                          {replyId === entry.id && (
                            <form
                              className="flex gap-1.5"
                              onSubmit={(e) => {
                                e.preventDefault();
                                void sendReply(entry.id);
                              }}
                            >
                              <input
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value.substring(0, 200))}
                                placeholder="Reply as Kochan…"
                                aria-label="Reply text"
                                className="min-w-0 flex-1 rounded border-2 border-foreground bg-card px-2 py-1 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                              />
                              <button
                                type="submit"
                                className="rounded border-2 border-foreground bg-accent px-2 py-1 text-[10px] font-black uppercase text-accent-foreground cursor-pointer active:translate-y-0.5"
                              >
                                Send
                              </button>
                              <button
                                type="button"
                                onClick={() => setReplyId(null)}
                                className="rounded border-2 border-foreground bg-card px-2 py-1 text-[10px] font-black uppercase text-foreground cursor-pointer active:translate-y-0.5"
                              >
                                Cancel
                              </button>
                            </form>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyId(replyId === entry.id ? null : entry.id);
                              setReplyText(entry.reply?.message ?? '');
                            }}
                            aria-label={entry.reply ? 'Edit reply' : 'Reply to entry'}
                            title="Reply"
                            className={iconButton}
                          >
                            <Reply className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewId(previewId === entry.id ? null : entry.id)}
                            aria-label="Preview formatted text"
                            title="Preview formatting"
                            aria-pressed={previewId === entry.id}
                            className={iconButton}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setHidden([entry.id], !entry.hidden)}
                            aria-label={entry.hidden ? 'Unhide entry' : 'Hide entry'}
                            title={entry.hidden ? 'Unhide entry' : 'Hide entry'}
                            className={
                              entry.hidden
                                ? 'inline-flex items-center justify-center rounded-lg border-2 border-foreground bg-red-300 p-1.5 text-[#14110f] shadow-[2px_2px_0_0_var(--foreground)] cursor-pointer active:translate-y-0.5 active:shadow-none transition-all'
                                : iconButton
                            }
                          >
                            <EyeOff className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePin(entry.id, !entry.pinned)}
                            aria-label={entry.pinned ? 'Unpin entry' : 'Pin entry'}
                            title={entry.pinned ? 'Unpin entry' : 'Pin entry'}
                            className={iconButton}
                          >
                            {entry.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                          </button>
                          {entry.ipHash && (
                            <button
                              type="button"
                              onClick={() => setBan(entry.ipHash ?? '')}
                              aria-label="Ban visitor for 24 hours"
                              title="Ban visitor (24h)"
                              className={iconButton}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeEntry(entry.id)}
                            aria-label="Delete entry"
                            className={iconButton}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>

            {/* M44: start, watch or close the question of the day */}
            <Card className="fluid-glass">
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-accent-ink" />
                  <h2 className="text-lg font-bold text-foreground">Question of the day</h2>
                </div>
                {overview.poll ? (
                  <>
                    <p className="text-sm font-bold text-foreground">{overview.poll.question}</p>
                    <ul className="space-y-1">
                      {overview.poll.options.map((option) => (
                        <li key={option.label} className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                          <span>{option.label}</span>
                          <span>
                            {option.count} vote{option.count === 1 ? '' : 's'}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={closePoll}
                      disabled={pollBusy}
                      className="rounded-lg border-2 border-foreground bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-[2px_2px_0_0_var(--foreground)] hover:bg-accent hover:text-accent-foreground active:translate-y-0.5 active:shadow-none disabled:opacity-50 transition-all cursor-pointer"
                    >
                      Close poll
                    </button>
                  </>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void createPoll();
                    }}
                    className="space-y-2"
                  >
                    <input
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value.substring(0, 140))}
                      placeholder="Question…"
                      aria-label="Poll question"
                      className="w-full rounded-lg border-2 border-foreground bg-card px-3 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                    <input
                      value={pollOptions}
                      onChange={(e) => setPollOptions(e.target.value.substring(0, 200))}
                      placeholder="Option A, Option B, Option C (2–5, comma separated)"
                      aria-label="Poll options"
                      className="w-full rounded-lg border-2 border-foreground bg-card px-3 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={
                        pollBusy ||
                        pollQuestion.trim().length < 3 ||
                        pollOptions.split(',').filter((option) => option.trim()).length < 2
                      }
                      className="rounded-lg bg-accent border-[3px] border-foreground px-4 py-2 text-sm font-bold text-accent-foreground shadow-[3px_3px_0_0_var(--foreground)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      {pollBusy ? 'Creating…' : 'Start poll'}
                    </button>
                  </form>
                )}
              </div>
            </Card>

            <Card className="fluid-glass">
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2">
                  <Bug className="w-5 h-5 text-accent-ink" />
                  <h2 className="text-lg font-bold text-foreground">Recent client errors</h2>
                </div>
                {overview.errors.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No errors reported. Nice.</p>
                ) : (
                  <ul className="space-y-2">
                    {overview.errors.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-start gap-3 rounded-lg border-2 border-foreground bg-secondary p-3 shadow-[2px_2px_0_0_var(--foreground)]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="break-all font-mono text-xs text-foreground">{entry.message}</p>
                          <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                            {entry.source} · {new Date(entry.lastSeenAt ?? entry.createdAt).toLocaleString()}
                            {entry.url ? ` · ${entry.url}` : ''}
                            {entry.count > 1 ? ` · seen ${entry.count}×` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => resolveError(entry.id)}
                          aria-label="Mark as resolved"
                          title="Mark as resolved"
                          className={iconButton}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
