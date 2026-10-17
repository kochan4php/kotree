'use client';

import { useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { BarChart3, LogOut, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';

interface Overview {
  totalClicks: number;
  links: { name: string; count: number }[];
  guestbook: { id: string; message: string; createdAt: string; userAgent?: string }[];
}

const iconButton =
  'inline-flex items-center justify-center w-9 h-9 rounded-lg border-2 border-foreground bg-card text-foreground shadow-[2px_2px_0_0_var(--foreground)] hover:bg-accent hover:text-accent-foreground active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all';

export default function AdminDashboard() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async (t: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/overview', { headers: { Authorization: `Bearer ${t}` } });
      if (res.status === 503) throw new Error('Admin is not configured — set ADMIN_TOKEN in the environment.');
      if (res.status === 401) throw new Error('Wrong token.');
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      setOverview(await res.json());
      setAuthed(true);
      setToken(t);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load');
      setAuthed(false);
      setOverview(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim() && !isLoading) load(token.trim());
  };

  const logout = () => {
    setToken('');
    setAuthed(false);
    setOverview(null);
  };

  const removeEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/guestbook?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setOverview((prev) => (prev ? { ...prev, guestbook: prev.guestbook.filter((e) => e.id !== id) } : prev));
      toast.success('Entry deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const maxCount = Math.max(1, ...(overview?.links.map((l) => l.count) ?? []));

  return (
    <main className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2">
      <div className="relative max-w-2xl md:max-w-3xl mx-auto space-y-3">
        <Card className="fluid-glass">
          <div className="liquid-gradient"></div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-accent-ink" />
              <h1 className="text-xl font-black tracking-tight text-foreground">Admin</h1>
            </div>

            {!authed ? (
              <form onSubmit={handleConnect} className="flex gap-2">
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
                  disabled={!token.trim() || isLoading}
                  className="rounded-lg bg-accent border-[3px] border-foreground px-4 py-2 text-sm font-bold text-accent-foreground shadow-[3px_3px_0_0_var(--foreground)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? 'Checking…' : 'Connect'}
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground font-medium">Connected.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => load(token)} disabled={isLoading} aria-label="Refresh data" className={iconButton}>
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

        {authed && overview && (
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
              <div className="relative z-10 space-y-4">
                <h2 className="text-lg font-bold text-foreground">Guestbook moderation</h2>

                {overview.guestbook.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No entries yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {overview.guestbook.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-start gap-3 rounded-lg border-2 border-foreground bg-secondary p-3 shadow-[2px_2px_0_0_var(--foreground)]"
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-xs font-mono break-all text-foreground">{entry.message}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">
                            {new Date(entry.createdAt).toLocaleString()}
                            {entry.userAgent ? ` · ${entry.userAgent.slice(0, 60)}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.id)}
                          aria-label="Delete entry"
                          className={iconButton}
                        >
                          <Trash2 className="w-4 h-4" />
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
