import { createHash } from 'crypto';

// M26: public GET endpoints answer conditional requests. The payloads are
// small, so hashing the body is cheaper than a second database round trip.
// `no-cache` still lets browsers and the CDN store the response — they just
// have to revalidate it, and revalidation is now a body-less 304.
export function jsonWithEtag(request: Request, data: unknown, cacheControl = 'no-cache'): Response {
  const body = JSON.stringify(data);
  const etag = `W/"${createHash('sha1').update(body).digest('hex').slice(0, 16)}"`;
  const headers = { 'Cache-Control': cacheControl, ETag: etag, 'Content-Type': 'application/json' };
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { 'Cache-Control': cacheControl, ETag: etag } });
  }
  return new Response(body, { status: 200, headers });
}
