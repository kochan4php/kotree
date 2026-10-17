import { NextResponse } from 'next/server';
import { pingDb } from '@/connections/mongodb';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Uptime endpoint: 200 = everything reachable, 503 = Mongo is down
// (counters and guestbook cannot work without it).
export async function GET(request: Request) {
  if (await isRateLimited(`health:${getClientIp(request)}`, 60)) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  const mongo = await pingDb();
  return NextResponse.json(
    { status: mongo ? 'ok' : 'degraded', mongo, time: new Date().toISOString() },
    { status: mongo ? 200 : 503 }
  );
}
