const allowedOrigins = new Set(
  [
    process.env.NEXT_PUBLIC_BASE_URL,
    'http://localhost:3000',
    'https://localhost:3000',
  ].filter((origin): origin is string => Boolean(origin)),
);

export function guardOrigin(request: Request): Response | null {
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  const trusted = origin !== null && allowedOrigins.has(origin) && site === 'same-origin';
  return trusted ? null : new Response('Forbidden', { status: 403 });
}
