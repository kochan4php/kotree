import { Suspense } from 'react';
import { getYearStats } from '@/connections/mongodb';
import LocalSecrets from '@/components/stats/local-secrets';
import WrappedExport from '@/components/stats/wrapped-export';
import YearCarousel from '@/components/content/year-carousel';
import { Card } from '@/components/ui/card';
import Skeleton from '@/components/ui/skeleton';
import { collectTags, formatDate, getNotes } from '@/lib/content';
import { site } from '@/lib/site';
import { breadcrumbLd, pageOg } from '@/lib/seo';
import { ArrowLeft, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';

// K29: the year in one page — clicks, favourite link, busiest day, wall
// activity and your own secret tally. Live reads, fail-soft to zeros.
// M3: the shell (back link + title) paints first, the numbers stream in.

const currentYear = new Date().getFullYear();

export const metadata: Metadata = {
  title: `Kotree Wrapped ${currentYear}`,
  description: `The ${currentYear} recap — clicks, the busiest day and everything the guestbook got up to.`,
  alternates: { canonical: `${site.baseUrl}/wrapped` },
  ...pageOg('wrapped', `Kotree Wrapped ${currentYear}`),
};

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-foreground/20 py-2 last:border-0">
      <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-bold text-foreground">{value}</dd>
    </div>
  );
}

const pad = (hour: number) => String(hour).padStart(2, '0');

// M50: ?year=2025 opens that year's recap (clamped to the site's own lifetime)
export default async function WrappedPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const parsed = Number(params.year);
  const year = Number.isInteger(parsed) && parsed >= 2022 && parsed <= currentYear ? parsed : currentYear;
  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd('Wrapped', '/wrapped')) }}
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
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="flex items-center gap-2">
              <PartyPopper className="w-5 h-5 text-accent-ink" aria-hidden="true" />
              <h1 className="text-3xl font-black tracking-tight text-foreground">Kotree Wrapped {year}</h1>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              The year so far, straight from the counter.
            </p>
          </div>
        </Card>

        {/* M71: every year the site has lived through, one drag away */}
        <YearCarousel
          years={Array.from({ length: currentYear - 2022 + 1 }, (_, index) => 2022 + index)}
          active={year}
        />

        <Suspense fallback={<WrappedFallback />}>
          <WrappedBody year={year} />
        </Suspense>
      </div>
    </main>
  );
}

function WrappedFallback() {
  return (
    <>
      <Card className="fluid-glass mt-3">
        <div className="relative z-10">
          <Skeleton rows={4} />
        </div>
      </Card>
      <Card className="fluid-glass mt-3">
        <div className="relative z-10">
          <Skeleton rows={4} />
        </div>
      </Card>
    </>
  );
}

async function WrappedBody({ year }: { year: number }) {
  const stats = await getYearStats(year);
  const share =
    stats.topLink && stats.yearClicks > 0 ? Math.round((stats.topLink.count / stats.yearClicks) * 100) : 0;

  // G6: what the notes themselves did this year — the tag they leaned on most
  // and the one that opened the year.
  const yearNotes = getNotes().filter((note) => note.date.startsWith(`${year}-`));
  const tagOfTheYear = collectTags(yearNotes)[0] ?? null;
  const firstNote = [...yearNotes].sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;

  // Ring geometry: dasharray is the full circumference, dashoffset hides all
  // but the share. The draw-in animation lives in globals.css, motion-gated.
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const target = circumference * (1 - share / 100);
  const ringStyle = {
    '--kt-circ': `${circumference}`,
    '--kt-target': `${target}`,
  } as CSSProperties;

  return (
    <>
      <Card className="fluid-glass mt-3">
        <div className="liquid-gradient"></div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <svg
            viewBox="0 0 140 140"
            width="150"
            height="150"
            role="img"
            aria-label={
              stats.topLink
                ? `${share}% of this year's clicks went to ${stats.topLink.name}`
                : 'No clicks recorded this year yet'
            }
          >
            <circle cx="70" cy="70" r={radius} fill="none" stroke="currentColor" strokeWidth="14" className="text-secondary" />
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${circumference}`}
              className="kt-ring text-accent-ink"
              style={ringStyle}
              transform="rotate(-90 70 70)"
            />
            <text x="70" y="67" textAnchor="middle" fontSize="26" fontWeight="900" className="fill-foreground font-display">
              {share}%
            </text>
            <text x="70" y="87" textAnchor="middle" fontSize="9" fontWeight="700" className="fill-muted-foreground">
              TOP LINK SHARE
            </text>
          </svg>

          <p className="mt-3 text-sm font-bold text-foreground">
            {stats.topLink ? (
              <>
                <span className="text-accent-ink">{stats.topLink.name}</span> was the link of the year with{' '}
                {stats.topLink.count} taps.
              </>
            ) : (
              <>No clicks yet this year — the counter is watching.</>
            )}
          </p>
        </div>
      </Card>

      <Card className="fluid-glass mt-3">
        <div className="liquid-gradient"></div>
        <div className="relative z-10">
          <h2 className="text-lg font-bold text-foreground">The year in numbers</h2>
          <dl className="mt-3">
            <Row label="Total clicks" value={`${stats.yearClicks}`} />
            <Row
              label="Busiest day"
              value={stats.busiestDay ? `${formatDate(stats.busiestDay.day)} (${stats.busiestDay.count} clicks)` : '—'}
            />
            <Row label="Messages on the wall" value={`${stats.guestbookCount}`} />
            <Row
              label="Reigning reaction"
              value={stats.topReaction ? `${stats.topReaction.emoji} ×${stats.topReaction.count}` : '—'}
            />
            <Row
              label="Longest click streak"
              value={
                stats.longestStreak > 0
                  ? `${stats.longestStreak} ${stats.longestStreak === 1 ? 'day' : 'days'} in a row`
                  : '—'
              }
            />
            <Row
              label="Busiest hour (UTC)"
              value={
                stats.busiestHour === null
                  ? '—'
                  : `${pad(stats.busiestHour)}:00–${pad((stats.busiestHour + 1) % 24)}:00`
              }
            />
          </dl>
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            <LocalSecrets />
          </p>
          <WrappedExport
            year={year}
            clicks={stats.yearClicks}
            share={share}
            topLink={stats.topLink}
            busiestDay={
              stats.busiestDay ? `${formatDate(stats.busiestDay.day)} (${stats.busiestDay.count} clicks)` : null
            }
            messages={stats.guestbookCount}
            reaction={stats.topReaction ? `${stats.topReaction.emoji} ×${stats.topReaction.count}` : null}
            url={site.baseUrl}
          />
        </div>
      </Card>

      {yearNotes.length > 0 && (
        <Card className="fluid-glass mt-3">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h2 className="text-lg font-bold text-foreground">From the notes</h2>
            <dl className="mt-3">
              <Row
                label="Most-used tag"
                value={
                  tagOfTheYear
                    ? `#${tagOfTheYear.tag} · ${tagOfTheYear.count} ${
                        tagOfTheYear.count === 1 ? 'note' : 'notes'
                      }`
                    : '—'
                }
              />
              <Row
                label="First note of the year"
                value={
                  firstNote ? (
                    <Link
                      href={`/notes/${firstNote.slug}`}
                      className="text-accent-ink underline underline-offset-2"
                    >
                      {firstNote.title}
                    </Link>
                  ) : (
                    '—'
                  )
                }
              />
            </dl>
            <p className="mt-3 text-xs font-medium text-muted-foreground">
              {yearNotes.length} {yearNotes.length === 1 ? 'note carries' : 'notes carry'} a {year} date.
            </p>
          </div>
        </Card>
      )}
    </>
  );
}
