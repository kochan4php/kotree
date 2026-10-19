import { NextResponse } from 'next/server';
import { getPublicStats } from '@/connections/mongodb';

export const dynamic = 'force-dynamic';

// G5: the same public numbers /stats renders, for badges, scripts and anyone
// who would rather not scrape HTML. Nothing personal is in here, and the
// response is cacheable for a minute.

export async function GET() {
  const stats = await getPublicStats();
  return NextResponse.json(
    { generatedAt: new Date().toISOString(), ...stats },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600' } }
  );
}
