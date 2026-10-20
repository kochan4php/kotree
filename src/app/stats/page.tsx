import { Suspense } from 'react';
import { getPublicStats } from '@/connections/mongodb';
import BadgeBuilder from '@/components/stats/badge-builder';
import LocalSecrets from '@/components/stats/local-secrets';
import { Card } from '@/components/ui/card';
import Skeleton from '@/components/ui/skeleton';
import { weekChange } from '@/lib/stats-delta';
import { site } from '@/lib/site';
import { breadcrumbLd, pageOg } from '@/lib/seo';
import { ArrowLeft, BarChart3, HeartHandshake } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

// K26: the public numbers page. Live reads straight from Mongo (no caching
// beyond the CDN header below), fail-soft to zeros when the database blinks.
// M3: the shell (back link + title) paints first, the numbers stream in.

export const metadata: Metadata = {
  title: 'Stats',
  description: 'The public numbers behind Kotree — clicks, links, trends and reactions.',
  alternates: { canonical: `${site.baseUrl}/stats` },
  ...pageOg('stats', 'Kotree stats — clicks, links and reactions'),
};

function shortDay(day: string): string {
  const [, month, date] = day.split('-');
  return `${date}/${month}`;
}

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const days = (await searchParams).days === '7' ? 7 : 30;

  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd('Stats', '/stats')) }}
      />
      <div className="relative mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="inline-flex min-h-6 items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Home
        </Link>

        <Card className="fluid-glass mt-3">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-accent-ink" aria-hidden="true" />
              <h1 className="text-3xl font-black tracking-tight text-foreground">The numbers</h1>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              Every tap counted here is deduplicated per visitor per day — no accounts, no tracking beyond that.
            </p>

            <p className="mt-3 text-xs font-medium text-muted-foreground">
              <LocalSecrets />
            </p>
          </div>
        </Card>

        <Card className="fluid-glass mt-3">
          <div className="liquid-gradient"></div>
          <BadgeBuilder />
        </Card>

        <Suspense fallback={<StatsFallback />}>
          <StatsBody days={days} />
        </Suspense>
      </div>
    </main>
  );
}

function StatsFallback() {
  return (
    <>
      <Card className="fluid-glass mt-3">
        <div className="relative z-10">
          <Skeleton rows={1} />
        </div>
      </Card>
      <Card className="fluid-glass mt-3">
        <div className="relative z-10">
          <Skeleton rows={4} />
        </div>
      </Card>
      <Card className="fluid-glass mt-3">
        <div className="relative z-10">
          <Skeleton rows={2} />
        </div>
      </Card>
    </>
  );
}

async function StatsBody({ days }: { days: number }) {
  const stats = await getPublicStats();
  const series = days === 7 ? stats.last30Days.slice(-7) : stats.last30Days;
  const maxLink = Math.max(1, ...stats.topLinks.map((link) => link.count));
  const maxDay = Math.max(1, ...series.map((day) => day.count));
  const week = weekChange(stats.last30Days);

  return (
    <>
      <Card className="fluid-glass mt-3">
        <div className="liquid-gradient"></div>
        <div className="relative z-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border-[3px] border-foreground bg-card p-3 shadow-[3px_3px_0_0_var(--foreground)]">
            <div className="font-display text-3xl text-foreground tabular-nums">{stats.totalClicks}</div>
            <div className="mt-1 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Total clicks
            </div>
          </div>
          <div className="rounded-lg border-[3px] border-foreground bg-card p-3 shadow-[3px_3px_0_0_var(--foreground)]">
            <div className="font-display text-3xl text-foreground tabular-nums">{stats.topLinks.length}</div>
            <div className="mt-1 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Links clicked
            </div>
          </div>
          <div className="rounded-lg border-[3px] border-foreground bg-card p-3 shadow-[3px_3px_0_0_var(--foreground)]">
            <div className="font-display text-3xl text-foreground tabular-nums">{stats.guestbookCount}</div>
            <div className="mt-1 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Secrets left
            </div>
          </div>
        </div>
      </Card>

      <Card className="fluid-glass mt-3">
        <div className="liquid-gradient"></div>
        <div className="relative z-10">
          <h2 className="text-lg font-bold text-foreground">Most tapped links</h2>
          {stats.topLinks.length === 0 ? (
            <p className="mt-2 text-sm italic text-muted-foreground">No clicks recorded yet — be the first.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {stats.topLinks.map((link) => (
                <div key={link.name} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-xs font-bold text-foreground" title={link.name}>
                    {link.name}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded border-2 border-foreground bg-secondary">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${Math.max(3, (link.count / maxLink) * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs font-mono font-bold text-foreground tabular-nums">
                    {link.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="fluid-glass mt-3">
        <div className="liquid-gradient"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-foreground">Last {days} days</h2>
            <div className="flex gap-1" aria-label="Chart range">
              {[7, 30].map((range) => (
                <Link
                  key={range}
                  href={range === 30 ? '/stats' : `/stats?days=${range}`}
                  aria-current={days === range ? 'page' : undefined}
                  className={`inline-flex min-h-6 items-center rounded border-2 border-foreground px-2 text-[10px] font-mono font-bold transition-colors ${
                    days === range
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {range} days
                </Link>
              ))}
            </div>
          </div>
          {stats.totalClicks === 0 ? (
            <p className="mt-2 text-sm italic text-muted-foreground">Nothing to plot yet.</p>
          ) : (
            <>
              <div className="mt-3 flex h-24 items-end gap-1" role="img" aria-label={`Daily clicks over the last ${days} days`}>
                {series.map((day) => (
                  <div
                    key={day.day}
                    className="flex-1 rounded-t border-2 border-foreground bg-accent"
                    style={{ height: `${Math.max(4, (day.count / maxDay) * 100)}%` }}
                    title={`${day.day}: ${day.count} clicks`}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] font-mono font-bold text-muted-foreground">
                <span>{shortDay(series[0].day)}</span>
                <span>{shortDay(series[series.length - 1].day)}</span>
              </div>
              {/* G4: the same series, read as a week-on-week comparison */}
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                This week: <strong className="text-foreground tabular-nums">{week.last7}</strong> clicks
                {week.percent === null
                  ? ' — nothing recorded the week before to compare with.'
                  : week.percent === 0
                    ? ' — level with the week before.'
                    : ` — ${week.percent > 0 ? 'up' : 'down'} ${Math.abs(week.percent)}% on the week before.`}
              </p>
            </>
          )}
        </div>
      </Card>

      <Card className="fluid-glass mt-3">
        <div className="liquid-gradient"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-accent-ink" aria-hidden="true" />
            <h2 className="text-lg font-bold text-foreground">Top reactions</h2>
          </div>
          {stats.topReactions.length === 0 ? (
            <p className="mt-2 text-sm italic text-muted-foreground">No reactions on the wall yet — the secrets are waiting.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {stats.topReactions.map((reaction) => (
                <li
                  key={reaction.emoji}
                  className="inline-flex items-center gap-1.5 rounded-lg border-[3px] border-foreground bg-secondary px-3 py-1.5 text-sm font-bold text-foreground shadow-[2px_2px_0_0_var(--foreground)]"
                >
                  <span aria-hidden="true">{reaction.emoji}</span>
                  <span className="font-mono text-xs tabular-nums">{reaction.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}
