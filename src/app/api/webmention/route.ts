import { NextResponse } from 'next/server';
import { addWebmention, getApprovedWebmentions, hashIp } from '@/connections/mongodb';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { site } from '@/lib/site';
import { fetchWebmentionSource, parseWebmention } from '@/lib/webmention';

export const dynamic = 'force-dynamic';

const MAX_BODY = 4_096;

// A declared length is only a hint; a chunked request can still be larger.
// Stop reading at the same ceiling instead of buffering whatever arrives.
async function readBody(request: Request): Promise<string> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total <= MAX_BODY) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  if (total > MAX_BODY) throw new Error('payload too large');
  return new TextDecoder().decode(Buffer.concat(chunks));
}

// Public read side of the inbox: only approved mentions for one target.
export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get('target') ?? '';
  if (!target.startsWith(site.baseUrl)) {
    return NextResponse.json({ mentions: [] });
  }
  try {
    const mentions = await getApprovedWebmentions(target);
    return NextResponse.json(
      {
        mentions: mentions.map((mention) => ({
          id: mention.id,
          source: mention.source,
          title: mention.title,
          author: mention.author,
          excerpt: mention.excerpt,
          createdAt: mention.createdAt,
        })),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    );
  } catch {
    return NextResponse.json({ mentions: [] }, { status: 503, headers: { 'Retry-After': '120' } });
  }
}

// P13: receive a webmention. The sender is unauthenticated by design, so the
// only proof we accept is the source page linking back to the target. Every
// accepted mention starts pending; nothing is public until moderation.
export async function POST(request: Request) {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY) return new NextResponse('Payload too large', { status: 413 });

  const ip = getClientIp(request);
  if (await isRateLimited(`webmention:${ip}`)) {
    return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
  }

  let raw: string;
  try {
    raw = await readBody(request);
  } catch {
    return new NextResponse('Payload too large', { status: 413 });
  }

  let source = '';
  let target = '';
  try {
    const type = request.headers.get('content-type') ?? '';
    if (type.includes('application/json')) {
      const body = JSON.parse(raw) as { source?: unknown; target?: unknown };
      source = typeof body.source === 'string' ? body.source : '';
      target = typeof body.target === 'string' ? body.target : '';
    } else {
      const body = new URLSearchParams(raw);
      source = body.get('source') ?? '';
      target = body.get('target') ?? '';
    }
  } catch {
    return new NextResponse('source and target are required', { status: 400 });
  }

  if (!source || !target || source.length > 2048 || target.length > 2048) {
    return new NextResponse('source and target are required', { status: 400 });
  }

  const requestOrigin = new URL(request.url).origin;
  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch {
    return new NextResponse('target must be an absolute URL', { status: 400 });
  }
  if (targetUrl.origin !== requestOrigin && targetUrl.origin !== new URL(site.baseUrl).origin) {
    return new NextResponse('target must be on this site', { status: 400 });
  }
  if (targetUrl.protocol !== 'https:' && targetUrl.protocol !== 'http:') {
    return new NextResponse('target must be an http(s) page', { status: 400 });
  }
  if (targetUrl.username || targetUrl.password) {
    return new NextResponse('target must not carry credentials', { status: 400 });
  }

  let html: string;
  try {
    html = await fetchWebmentionSource(source);
  } catch {
    return new NextResponse('Could not fetch the source', { status: 422 });
  }

  const parsed = parseWebmention(html, source, targetUrl.toString());
  if (!parsed) return new NextResponse('source does not link to target', { status: 400 });

  try {
    const result = await addWebmention({ ...parsed, ipHash: hashIp(ip) });
    return NextResponse.json({ status: result === 'duplicate' ? 'duplicate' : 'pending' }, { status: 202 });
  } catch {
    return new NextResponse('Webmention storage is temporarily unavailable', {
      status: 503,
      headers: { 'Retry-After': '120' },
    });
  }
}
