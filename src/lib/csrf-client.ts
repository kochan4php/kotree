// Mirrors generateToken() in lib/security.ts (which can't be imported here —
// it pulls in node:crypto). The token is public by design: it already ships
// in the page HTML. It only proves a POST came from our own render, while
// the origin guard in the API routes is the real protection.
export function clientToken(): string {
  if (typeof window === 'undefined') return '';
  const timeSlice = Math.floor(Date.now() / (1000 * 60 * 60));
  const secret = process.env.NEXT_PUBLIC_BASE_URL || 'kotree';
  return btoa(`${timeSlice}:${secret}`).substring(0, 15);
}
