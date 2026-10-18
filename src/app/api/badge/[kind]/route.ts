import { getPublicStats, getYearStats } from '@/connections/mongodb';
import { buildBadgeSvg } from '@/lib/badge';

// M52: README badges — /api/badge/clicks.svg and /api/badge/wrapped.svg.
// Server-rendered SVG strings, cached for an hour at the edge, and fail-soft
// so a sleeping database never leaves a broken image in someone's README.
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const name = kind.replace(/\.svg$/, '');
  if (name !== 'clicks' && name !== 'wrapped') {
    return new Response('Not found', { status: 404 });
  }

  let value = 'offline';
  try {
    if (name === 'clicks') {
      const stats = await getPublicStats();
      value = `${stats.totalClicks.toLocaleString('en-US')} clicks`;
    } else {
      const year = new Date().getFullYear();
      const stats = await getYearStats(year);
      value = `${stats.yearClicks.toLocaleString('en-US')} in ${year}`;
    }
  } catch {
    // keep the fallback value
  }

  const svg = buildBadgeSvg({ label: name === 'clicks' ? 'kotree' : 'kotree wrapped', value });
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
