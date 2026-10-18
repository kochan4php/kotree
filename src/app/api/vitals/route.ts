import { NextResponse } from 'next/server';
import { addVitals, type VitalSample } from '@/connections/mongodb';
import { guardOrigin } from '@/lib/security';
import { VITAL_THRESHOLDS, rateVital } from '@/lib/vitals';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const forbidden = guardOrigin(request);
  if (forbidden) return forbidden;

  if (await isRateLimited(`vitals:${getClientIp(request)}`, 60)) {
    return new NextResponse(null, { status: 429, headers: { 'Retry-After': '60' } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const { path, metrics } = (body ?? {}) as { path?: unknown; metrics?: unknown };
  if (
    typeof path !== 'string' ||
    !path.startsWith('/') ||
    path.length > 120 ||
    typeof metrics !== 'object' ||
    metrics === null
  ) {
    return new NextResponse(null, { status: 400 });
  }

  const day = new Date().toISOString().slice(0, 10);
  const samples: VitalSample[] = [];
  for (const metric of Object.keys(VITAL_THRESHOLDS)) {
    const value = (metrics as Record<string, unknown>)[metric];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 60_000) continue;
    samples.push({ page: path, metric, value, rating: rateVital(metric, value), day });
  }
  if (samples.length === 0) return new NextResponse(null, { status: 400 });

  await addVitals(samples).catch(() => {}); // beacons are fire-and-forget
  return new NextResponse(null, { status: 204 });
}
