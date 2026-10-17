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
    // Resource failures (img/script/link) don't bubble; the capture phase
    // catches them as plain events whose target is the failing element.
    const onResourceError = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target || target === (window as unknown as HTMLElement)) return;
      const tag = target.tagName?.toLowerCase();
      if (tag === 'img' || tag === 'script' || tag === 'link' || tag === 'video' || tag === 'audio') {
        const src =
          (target as HTMLImageElement).src ?? (target as HTMLLinkElement).href ?? '';
        send(`Failed to load <${tag}>: ${src.slice(0, 200)}`, 'resource');
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason: unknown = event.reason;
      send(
        reason instanceof Error ? reason.message : String(reason),
        'unhandledrejection',
        reason instanceof Error ? reason.stack : undefined
      );
    };

    window.addEventListener('error', onError);
    window.addEventListener('error', onResourceError, true);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('error', onResourceError, true);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
