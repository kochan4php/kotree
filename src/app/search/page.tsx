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
  body: string;
  tags: string[];
  date: string;
  url: string;
}

function searchable(): Result[] {
  return [
    ...getProjects().map((project) => ({
      type: 'project' as const,
      title: project.title,
      summary: project.summary,
      body: project.body,
      tags: project.tags,
      date: project.date,
      url: `/projects/${project.slug}`,
    })),
    ...getNotes().map((note) => ({
      type: 'note' as const,
      title: note.title,
      summary: note.summary,
      body: note.body,
      tags: note.tags,
      date: note.date,
      url: `/notes/${note.slug}`,
    })),
  ];
}

function plain(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function snippet(result: Result, query: string): string {
  const body = plain(result.body);
  const term = query.toLowerCase().split(/\s+/).find((word) => word.length > 2);
  const at = term ? body.toLowerCase().indexOf(term) : -1;
  const start = at > 60 ? at - 60 : 0;
  const text = body.slice(start, start + 190);
  return `${start > 0 ? '…' : ''}${text}${start + 190 < body.length ? '…' : ''}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function Highlight({ text, query }: { text: string; query: string }) {
  const terms = [...new Set(query.toLowerCase().split(/\s+/).filter((term) => term.length > 1))];
  if (terms.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  return (
    <>
      {text.split(pattern).map((part, index) =>
        terms.includes(part.toLowerCase()) ? (
          <mark key={index} className="bg-accent px-0.5 text-accent-foreground">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; tag?: string; year?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? '').trim().slice(0, 80);
  const type = params.type === 'note' || params.type === 'project' ? params.type : '';
  const tag = (params.tag ?? '').trim().slice(0, 40);
  const year = /^\d{4}$/.test(params.year ?? '') ? params.year! : '';
  const sort = params.sort === 'newest' ? 'newest' : 'relevance';

  const all = searchable();
  const tags = [...new Set(all.flatMap((entry) => entry.tags))].sort((a, b) => a.localeCompare(b));
  const years = [...new Set(all.map((entry) => entry.date.slice(0, 4)).filter(Boolean))].sort().reverse();
  const filtered = all.filter(
    (entry) =>
      (!type || entry.type === type) &&
      (!tag || entry.tags.some((entryTag) => entryTag.toLowerCase() === tag.toLowerCase())) &&
      (!year || entry.date.startsWith(year))
  );

  const activeFilters = Boolean(type || tag || year || sort === 'newest');
  const results = (query || activeFilters ? filtered : [])
    .map((entry) => {
      if (!query) return { entry, score: 0 };
      const inName = fuzzy(query, `${entry.title} ${entry.tags.join(' ')}`);
      const inSummary = fuzzy(query, entry.summary);
      const inBody = fuzzy(query, plain(entry.body).slice(0, 4000));
      if (!inName && !inSummary && !inBody) return null;
      return {
        entry,
        score: Math.max(inName?.score ?? -99, (inSummary?.score ?? -99) - 8, (inBody?.score ?? -99) - 20),
      };
    })
    .filter((hit): hit is { entry: Result; score: number } => hit !== null)
    .sort((a, b) =>
      sort === 'newest'
        ? b.entry.date.localeCompare(a.entry.date) || a.entry.title.localeCompare(b.entry.title)
        : !query
          ? b.entry.date.localeCompare(a.entry.date) || a.entry.title.localeCompare(b.entry.title)
          : b.score - a.score || a.entry.title.localeCompare(b.entry.title)
    )
    .slice(0, 30)
    .map((hit) => hit.entry);

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

            <form action="/search" method="get" className="mt-4">
              <div className="flex items-stretch gap-2">
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
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Type
                  <select name="type" defaultValue={type} className="mt-1 w-full rounded-lg border-2 border-foreground bg-background px-2 py-2 text-xs font-bold text-foreground">
                    <option value="">Everything</option>
                    <option value="note">Notes</option>
                    <option value="project">Projects</option>
                  </select>
                </label>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Tag
                  <select name="tag" defaultValue={tag} className="mt-1 w-full rounded-lg border-2 border-foreground bg-background px-2 py-2 text-xs font-bold text-foreground">
                    <option value="">Any tag</option>
                    {tags.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Year
                  <select name="year" defaultValue={year} className="mt-1 w-full rounded-lg border-2 border-foreground bg-background px-2 py-2 text-xs font-bold text-foreground">
                    <option value="">Any year</option>
                    {years.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Sort
                  <select name="sort" defaultValue={sort} className="mt-1 w-full rounded-lg border-2 border-foreground bg-background px-2 py-2 text-xs font-bold text-foreground">
                    <option value="relevance">Relevance</option>
                    <option value="newest">Newest</option>
                  </select>
                </label>
              </div>
            </form>

            {(query || activeFilters) && (
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground" aria-live="polite">
                {results.length === 0
                  ? `Nothing matched ${query ? `“${query}”` : 'those filters'}`
                  : `${results.length} ${results.length === 1 ? 'match' : 'matches'}${query ? ` for “${query}”` : ''}`}
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
                        {entry.type} · {entry.date}
                      </span>
                      <span className="mt-0.5 block font-display text-lg font-black text-foreground">
                        <Highlight text={entry.title} query={query} />
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        <Highlight text={snippet(entry, query)} query={query} />
                      </span>
                      {entry.tags.length > 0 && (
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          {entry.tags.slice(0, 4).map((entryTag) => (
                            <span key={entryTag} className="rounded border border-foreground/30 bg-secondary px-1.5 py-0.5 text-[10px] font-mono font-bold text-foreground">
                              {entryTag}
                            </span>
                          ))}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {!query && !activeFilters && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Search by title, tag or a phrase in the body. Try one of these:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['offline', 'performance', 'accessibility', 'next.js', 'case-study'].map((item) => (
                    <Link key={item} href={`/search?q=${encodeURIComponent(item)}`} className="rounded-lg border-2 border-foreground bg-card px-2.5 py-1 text-xs font-bold text-foreground hover:bg-accent hover:text-accent-foreground">
                      {item}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {query && results.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                Try a single word — the search matches letters in order, so “plte” finds “palette”.
                Clear a filter if you set one. The command palette (the search button in the top dock, or <kbd>/</kbd>) searches the rest of the site.
              </p>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
