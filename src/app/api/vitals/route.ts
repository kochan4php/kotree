import { NextResponse } from 'next/server';
import { addVitals, type VitalSample } from '@/connections/mongodb';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Core Web Vitals thresholds — rating is computed server-side so the client
// stays a dumb reporter.
const THRESHOLDS: Record<string, { poor: number; good: number }> = {
  LCP: { poor: 4000, good: 2500 },
  CLS: { poor: 0.25, good: 0.1 },
  INP: { poor: 500, good: 200 },
  TTFB: { poor: 1800, good: 800 },
  FCP: { poor: 3000, good: 1800 },
};

export async function POST(request: Request) {
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
  for (const [metric, threshold] of Object.entries(THRESHOLDS)) {
    const value = (metrics as Record<string, unknown>)[metric];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 60_000) continue;
    const rating = value > threshold.poor ? 'poor' : value > threshold.good ? 'ni' : 'good';
    samples.push({ page: path, metric, value, rating, day });
  }
  if (samples.length === 0) return new NextResponse(null, { status: 400 });

  await addVitals(samples).catch(() => {}); // beacons are fire-and-forget
  return new NextResponse(null, { status: 204 });
}
