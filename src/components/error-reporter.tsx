'use client';

import { useEffect } from 'react';

// Reports uncaught errors and unhandled rejections to /api/log (R41) so the
// admin dashboard can show what broke in the wild. Cheap by design: only in
// production, max 5 reports per page load, duplicates dropped, sent with
// sendBeacon so nothing blocks and nothing shows up in the user's console.
export default function ErrorReporter() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    const reported = new Set<string>();
    const send = (message: string, source: string, stack?: string) => {
      if (!message || reported.size >= 5 || reported.has(message)) return;
      // Prerendered pages fire nothing until they become the active document
      if ((document as Document & { prerendering?: boolean }).prerendering) return;
      reported.add(message);
      try {
        navigator.sendBeacon?.(
          '/api/log',
          new Blob(
            [JSON.stringify({ message, source, stack: stack?.slice(0, 2000), url: location.pathname })],
            { type: 'application/json' }
          )
        );
      } catch {
        // beacon unavailable — the report is not worth breaking anything over
      }
    };

    const onError = (event: ErrorEvent) => send(event.message, 'error', event.error?.stack);
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason: unknown = event.reason;
      send(
        reason instanceof Error ? reason.message : String(reason),
        'unhandledrejection',
        reason instanceof Error ? reason.stack : undefined
      );
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
