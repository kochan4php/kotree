'use client';

import { site } from '@/lib/site';
import { BadgeCheck, Check, Copy } from 'lucide-react';
import { useState } from 'react';

// The two badges the site actually serves (src/app/api/badge/[kind]). Kept
// deliberately short: one badge per statistic would be a wall of URLs nobody
// reads, and every one of them costs a request per README view.
const BADGES = [
  { kind: 'clicks', label: 'Total clicks', note: 'Every link tap, all time' },
  { kind: 'wrapped', label: 'This year', note: 'Clicks since January' },
] as const;

function CopyRow({ label, value, help }: { label: string; value: string; help: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked — the text beside the button is selectable by hand.
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="neo-press inline-flex shrink-0 items-center gap-1.5 rounded border-2 border-foreground bg-secondary px-2 py-1 text-[11px] font-mono font-bold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {label}
        <span aria-live="polite" className="sr-only">
          {copied ? `${help} copied to the clipboard` : ''}
        </span>
      </button>
      <code className="min-w-0 flex-1 truncate rounded border-2 border-foreground/20 bg-background/60 px-2 py-1 text-[11px] font-mono text-muted-foreground">
        {value}
      </code>
    </div>
  );
}

export default function BadgeBuilder() {
  const [kind, setKind] = useState<(typeof BADGES)[number]['kind']>('clicks');
  const path = `/api/badge/${kind}.svg`;
  const url = `${site.baseUrl}${path}`;
  const chosen = BADGES.find((badge) => badge.kind === kind);

  return (
    <div className="relative z-10">
      <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
        <BadgeCheck className="h-4 w-4 text-accent-ink" aria-hidden="true" />
        Put a badge in your README
      </h2>

      <div role="group" aria-label="Which badge" className="mt-3 flex flex-wrap gap-2">
        {BADGES.map((badge) => (
          <button
            key={badge.kind}
            type="button"
            onClick={() => setKind(badge.kind)}
            aria-pressed={kind === badge.kind}
            className="neo-press rounded-lg border-[3px] border-foreground px-3 py-1.5 text-xs font-black uppercase tracking-wide shadow-[3px_3px_0_0_var(--foreground)] transition-colors aria-pressed:bg-accent aria-pressed:text-accent-foreground hover:bg-accent/20"
          >
            {badge.label}
          </button>
        ))}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">{chosen?.note}</p>

      <div className="mt-3 flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- a live endpoint, not a static asset */}
        <img src={path} alt={`Kotree badge showing ${chosen?.note.toLowerCase()}`} className="h-5 w-auto" />
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <CopyRow label="URL" value={url} help="Badge URL" />
        <CopyRow label="Markdown" value={`![Kotree](${url})`} help="Badge markdown" />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Rebuilt at most once an hour, and it never leaves a broken image: if the database is asleep, the
        badge says so.
      </p>

      <p className="mt-2 text-xs text-muted-foreground">
        For everything else, the same numbers are public at{' '}
        <code className="rounded border-2 border-foreground/20 bg-background/60 px-1 py-0.5 font-mono text-[11px]">
          /api/stats.json
        </code>
        .</p>
    </div>
  );
}
