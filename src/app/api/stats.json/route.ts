import { getPublicStats } from '@/connections/mongodb';
import { jsonWithEtag } from '@/lib/http-cache';

export const dynamic = 'force-dynamic';

// G5: the same public numbers /stats renders, for badges, scripts and anyone
// who would rather not scrape HTML. Nothing personal is in here, and the
// response revalidates cheaply with an ETag.
export async function GET(request: Request) {
  const started = performance.now();
  const stats = await getPublicStats();
  const response = jsonWithEtag(
    request,
    { generatedAt: new Date().toISOString(), ...stats },
    'public, s-maxage=60, stale-while-revalidate=600'
  );
  response.headers.set('Server-Timing', `db;dur=${(performance.now() - started).toFixed(1)}`);
  return response;
}
