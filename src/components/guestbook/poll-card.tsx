'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { clientToken } from '@/lib/csrf-client';

interface PollOption {
  label: string;
  count: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  total: number;
}

const VOTED_KEY = 'kotree-gb-poll';

const today = () => new Date().toISOString().slice(0, 10);

function readVoted(): Record<string, string> {
  try {
    const raw = JSON.parse(localStorage.getItem(VOTED_KEY) ?? '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

// M44: one active question from the admin, live results, archive of past ones.
// The server allows one vote per visitor-day; the local record only hides the
// form — the unique index is the real gate.
export default function PollCard() {
  const [active, setActive] = useState<Poll | null>(null);
  const [archive, setArchive] = useState<Poll[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const [voting, setVoting] = useState(false);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    fetch('/api/poll')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setActive(data.active ?? null);
        setArchive(Array.isArray(data.archive) ? data.archive : []);
        if (data.active && readVoted()[data.active.id] === today()) setVoted(true);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const vote = async () => {
    if (!active || choice === null || voting || voted) return;
    setVoting(true);
    try {
      const res = await fetch('/api/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId: active.id, optionIndex: choice, _token: clientToken() }),
      });
      if (res.status === 409) {
        // Already counted today (another tab or device) — refresh the counts
        toast.info('You have already voted today');
        const fresh = await fetch('/api/poll')
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        if (fresh?.active) setActive(fresh.active);
      } else if (!res.ok) {
        throw new Error(String(res.status));
      } else {
        const data = await res.json().catch(() => null);
        if (data?.active) setActive(data.active);
        toast.success('Vote counted');
      }
      setVoted(true);
      try {
        localStorage.setItem(VOTED_KEY, JSON.stringify({ ...readVoted(), [active.id]: today() }));
      } catch {
        // private mode — the form just reappears after a reload
      }
    } catch {
      toast.error('Could not record your vote');
    } finally {
      setVoting(false);
    }
  };

  if (!loaded || (!active && archive.length === 0)) return null;

  const showResults = voted;

  return (
    <Card className="fluid-glass rounded-xl p-6 transition-all duration-300">
      <div className="relative z-10">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent-ink" />
          <h2 className="text-lg font-bold text-foreground">Question of the day</h2>
        </div>

        {active ? (
          <>
            <p className="mb-3 text-sm font-bold text-foreground">{active.question}</p>
            {showResults ? (
              <ul className="space-y-2" aria-label="Poll results">
                {active.options.map((option, index) => (
                  <li key={index}>
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold text-foreground">
                      <span>{option.label}</span>
                      <span>
                        {option.count} vote{option.count === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="mt-0.5 h-3 overflow-hidden rounded border-2 border-foreground bg-secondary">
                      <div
                        aria-hidden="true"
                        className="h-full bg-accent"
                        style={{ width: `${active.total ? Math.round((option.count / active.total) * 100) : 0}%` }}
                      />
                    </div>
                  </li>
                ))}
                <li className="text-[10px] font-mono text-muted-foreground">{active.total} vote(s) so far</li>
              </ul>
            ) : (
              <>
                <div role="radiogroup" aria-label={active.question} className="space-y-1.5">
                  {active.options.map((option, index) => (
                    <button
                      key={index}
                      type="button"
                      role="radio"
                      aria-checked={choice === index}
                      onClick={() => setChoice(index)}
                      className={`w-full cursor-pointer rounded-lg border-2 border-foreground px-3 py-1.5 text-left text-xs font-bold shadow-[2px_2px_0_0_var(--foreground)] transition-all active:translate-y-0.5 active:shadow-none ${
                        choice === index ? 'bg-accent text-accent-foreground' : 'bg-card text-foreground hover:bg-secondary'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={vote}
                  disabled={choice === null || voting}
                  className="mt-3 rounded-lg border-[3px] border-foreground bg-destructive px-3 py-1.5 text-xs font-bold text-[#14110f] shadow-[3px_3px_0_0_var(--foreground)] transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {voting ? 'Sending…' : 'Vote'}
                </button>
                <p className="mt-1.5 text-[10px] font-mono text-muted-foreground">One vote per visitor per day.</p>
              </>
            )}
          </>
        ) : (
          <p className="text-xs italic text-muted-foreground">No question right now — check back soon.</p>
        )}

        {archive.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-[10px] font-mono font-bold uppercase tracking-wider text-accent-ink">
              Past questions
            </summary>
            <ul className="mt-2 space-y-2">
              {archive.map((poll) => {
                const top = poll.options.reduce(
                  (best, option) => (option.count > best.count ? option : best),
                  poll.options[0] ?? { label: '—', count: 0 },
                );
                return (
                  <li key={poll.id} className="rounded-lg border-2 border-foreground bg-secondary px-3 py-2">
                    <p className="text-[11px] font-bold text-foreground">{poll.question}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {top.label} won with {top.count} vote{top.count === 1 ? '' : 's'} · {poll.total} total
                    </p>
                  </li>
                );
              })}
            </ul>
          </details>
        )}
      </div>
    </Card>
  );
}
