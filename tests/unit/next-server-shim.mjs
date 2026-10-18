// M75: a minimal stand-in for `next/server` so unit tests can call route
// handlers directly. Only the two exports the API routes use: NextResponse
// (same json() semantics as Next's) and after() (defers, never throws).
export class NextResponse extends Response {
  static json(body, init) {
    return new Response(JSON.stringify(body), {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
  }
}

export function after(callback) {
  Promise.resolve().then(callback).catch(() => {});
}
