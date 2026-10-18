'use client';

import { useState } from 'react';
import PageButton from '@/components/ui/page-button';
import StateCard from '@/components/ui/state-card';
import { socialLinks } from '@/data/social-links';
import { ArrowLeft, Dices, ExternalLink, Home, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { pickLucky } from '@/lib/lucky';

const PAGES = [
  { label: 'Home', href: '/', description: 'Every link in one place' },
  { label: 'About', href: '/about', description: 'Who is behind Kotree' },
  { label: 'Now', href: '/now', description: 'What I am up to right now' },
  { label: 'Projects', href: '/projects', description: 'Things I have built' },
  { label: 'Notes', href: '/notes', description: 'Short notes, newest first' },
  { label: 'Guestbook', href: '/guestbook', description: 'The full confession wall' },
  { label: 'Changelog', href: '/changelog', description: 'Every update, newest first' },
  { label: 'Secrets', href: '/secrets', description: 'Easter eggs and spoilers' },
];

interface Suggestion {
  label: string;
  href: string;
  description: string;
  external?: boolean;
}

export default function NotFound() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const suggestions: Suggestion[] = q
    ? [
        ...PAGES.filter((page) => `${page.label} ${page.description}`.toLowerCase().includes(q)),
        ...socialLinks
          .filter((link) => `${link.name} ${link.description}`.toLowerCase().includes(q))
          .map((link) => ({ label: link.name, href: link.url, description: link.description, external: true })),
      ].slice(0, 5)
    : [];

  const go = (item: { href: string; external?: boolean }) => {
    if (item.external || /^https?:|^mailto:/i.test(item.href)) {
      window.open(item.href, item.href.startsWith('mailto:') ? '_self' : '_blank', 'noopener');
    } else {
      router.push(item.href);
    }
  };

  const feelingLucky = () => {
    go(pickLucky());
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0) go(suggestions[0]);
  };

  return (
    <StateCard>
      <div className="">
        <p className="text-[120px] md:text-[160px] leading-none font-display tracking-tighter text-accent-ink [text-shadow:6px_6px_0_var(--foreground)] md:[text-shadow:9px_9px_0_var(--foreground)] mb-4">
          404
        </p>
      </div>
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground mb-2 uppercase">Sanctuary Lost</h1>
        <p className="text-muted-foreground leading-relaxed mb-8 max-w-md mx-auto text-balance">
          The link you followed might be broken, or the page may have been removed.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-center gap-3">
        <PageButton href="/">
          <Home size={20} />
          Back to Home
        </PageButton>
        <PageButton onClick={feelingLucky} variant="ghost">
          <Dices size={20} />
          Surprise me
        </PageButton>
        <PageButton onClick={() => router.back()} variant="ghost">
          <ArrowLeft size={20} />
          Go Back
        </PageButton>
      </div>

      <form onSubmit={onSubmit} className="relative mt-8">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Or search pages and links…"
          aria-label="Search pages and links"
          className="w-full rounded-lg border-[3px] border-foreground bg-card pl-9 pr-3 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground shadow-[2px_2px_0_0_var(--foreground)] focus:outline-none focus:shadow-[4px_4px_0_0_var(--foreground)] transition-shadow"
        />
      </form>

      {suggestions.length > 0 && (
        <ul className="mt-2 space-y-1 text-left">
          {suggestions.map((suggestion) => (
            <li key={suggestion.href}>
              <button
                type="button"
                onClick={() => go(suggestion)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border-2 border-foreground bg-secondary px-3 py-2 text-sm font-bold text-foreground shadow-[2px_2px_0_0_var(--foreground)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--foreground)] transition-all min-h-11"
              >
                <span>{suggestion.label}</span>
                <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                  {suggestion.description}
                  {suggestion.external && <ExternalLink className="w-3 h-3" aria-hidden="true" />}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q && suggestions.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground font-mono">No matches — try “projects” or “github”.</p>
      )}
    </StateCard>
  );
}
