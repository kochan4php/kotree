'use client';

import { useEffect } from 'react';

// K40: last-resort error page. The root layout may have crashed, so this
// renders its own <html>/<body> with inline styles (global CSS is not
// guaranteed to be loaded) and reports the failure with the same beacon the
// in-page reporter uses.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      navigator.sendBeacon?.(
        '/api/log',
        new Blob(
          [
            JSON.stringify({
              message: error.message || 'Unknown fatal error',
              source: 'global-error',
              stack: error.stack?.slice(0, 2000),
              url: typeof location !== 'undefined' ? location.pathname : '',
            }),
          ],
          { type: 'application/json' }
        )
      );
    } catch {
      // beacon unavailable — the fallback page still has to render
    }
  }, [error]);

  return (
    <html lang="en">
      <head>
        <style>{`
          :root { color-scheme: light; }
          .kt-ge { --ink: #14110f; --paper: #fff7e9; --card: #ffffff; }
        `}</style>
      </head>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '1.5rem',
          background: 'var(--paper)',
          color: 'var(--ink)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        }}
        className="kt-ge"
      >
        <main
          style={{
            maxWidth: '28rem',
            width: '100%',
            textAlign: 'center',
            background: 'var(--card)',
            border: '4px solid var(--ink)',
            boxShadow: '8px 8px 0 0 var(--ink)',
            padding: '2.5rem 1.75rem',
          }}
        >
          <p aria-hidden="true" style={{ fontSize: '2.5rem', margin: '0 0 0.5rem' }}>
            ⚠️
          </p>
          <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            System Collapse
          </h1>
          <p style={{ margin: '0 0 1.5rem', lineHeight: 1.6 }}>
            The page failed to load. The incident has been reported — try again, or come back in a bit.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              border: '3px solid var(--ink)',
              background: '#ff7c47',
              color: '#14110f',
              padding: '0.6rem 1.2rem',
              fontWeight: 800,
              fontSize: '0.95rem',
              boxShadow: '3px 3px 0 0 var(--ink)',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: '1.25rem', marginBottom: 0, fontSize: '0.7rem', opacity: 0.7, wordBreak: 'break-all' }}>
              Error ID: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
