import { Card } from '@/components/ui/card';
import { getNotes, getProjects } from '@/lib/content';
import { fuzzy } from '@/lib/fuzzy';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

// A search that works as a URL: the same notes and projects the command
// palette searches, filtered on the server, so a result set can be linked,
// shared and read with JavaScript switched off. The form is a plain GET.
export const metadata: Metadata = {
  title: 'Search',
  description: 'Search every note and project on Kotree.',
  robots: { index: false, follow: true },
};

interface Result {
  type: 'note' | 'project';
  title: string;
  summary: string;
  tags: string[];
  url: string;
}

function searchable(): Result[] {
  return [
    ...getProjects().map((project) => ({
      type: 'project' as const,
      title: project.title,
      summary: project.summary,
      tags: project.tags,
      url: `/projects/${project.slug}`,
    })),
    ...getNotes().map((note) => ({
      type: 'note' as const,
      title: note.title,
      summary: note.summary,
      tags: note.tags,
      url: `/notes/${note.slug}`,
    })),
  ];
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? '').trim().slice(0, 80);

  // Title and tags outrank the summary: a query that names a note should find
  // that note first, however late the word appears in its prose.
  const results = query
    ? searchable()
        .map((entry) => {
          const inName = fuzzy(query, `${entry.title} ${entry.tags.join(' ')}`);
          const inSummary = fuzzy(query, entry.summary);
          if (!inName && !inSummary) return null;
          return { entry, score: Math.max(inName?.score ?? -99, (inSummary?.score ?? -99) - 8) };
        })
        .filter((hit): hit is { entry: Result; score: number } => hit !== null)
        .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
        .slice(0, 30)
        .map((hit) => hit.entry)
    : [];

  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none"
    >
      <div className="relative mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="inline-flex min-h-6 items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Home
        </Link>

        <Card className="fluid-glass mt-3">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h1 className="font-display text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
              Search
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every note and project, matched on the server — the results have their own URL.
            </p>

            <form action="/search" method="get" className="mt-4 flex items-stretch gap-2">
              <label htmlFor="search-q" className="sr-only">
                Search notes and projects
              </label>
              <input
                id="search-q"
                type="search"
                name="q"
                defaultValue={query}
                placeholder="matcher, offline, palette…"
                autoComplete="off"
                className="w-full rounded-lg border-[3px] border-foreground bg-background px-3 py-2 text-sm font-bold text-foreground shadow-[4px_4px_0_0_var(--foreground)] placeholder:font-medium placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                type="submit"
                className="neo-press inline-flex shrink-0 items-center gap-1.5 rounded-lg border-[3px] border-foreground bg-accent px-4 py-2 text-sm font-black uppercase text-accent-foreground shadow-[4px_4px_0_0_var(--foreground)]"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                Search
              </button>
            </form>

            {query && (
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {results.length === 0
                  ? `Nothing matched “${query}”`
                  : `${results.length} ${results.length === 1 ? 'match' : 'matches'} for “${query}”`}
              </p>
            )}

            {results.length > 0 && (
              <ul className="mt-3 flex flex-col gap-3">
                {results.map((entry) => (
                  <li key={entry.url}>
                    <Link
                      href={entry.url}
                      className="neo-press block rounded-lg border-[3px] border-foreground bg-background/80 p-3 shadow-[4px_4px_0_0_var(--foreground)] transition-colors hover:bg-accent/10"
                    >
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                        {entry.type}
                      </span>
                      <span className="mt-0.5 block font-display text-lg font-black text-foreground">
                        {entry.title}
                      </span>
                      {entry.summary && (
                        <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {entry.summary}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {query && results.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                Try a single word — the search matches letters in order, so “plte” finds “palette”.
                The command palette (the search button in the top dock, or <kbd>/</kbd>) searches
                the rest of the site.
              </p>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
