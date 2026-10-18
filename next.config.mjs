/** @type {import('next').NextConfig} */
import { readFileSync } from 'node:fs';

// Version + deploy commit are baked in at build time so /status can show them
// without reading the filesystem at request time.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

// HSTS tells the browser to switch to HTTPS for this host. That is only
// correct where the site actually is served over HTTPS — on a plain-http host
// (localhost, CI) it locks other engines out. The CSP is not here: it lives in
// src/proxy.ts so every response can carry its own nonce (K54).
const httpsDeployment =
  process.env.NETLIFY === 'true' || (process.env.NEXT_PUBLIC_BASE_URL ?? '').startsWith('https://');

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    APP_VERSION: pkg.version,
    COMMIT_REF: process.env.COMMIT_REF ?? '',
  },
  // Pages render per request under the nonce CSP, so the files they read at
  // request time must ship inside the serverless function bundle.
  outputFileTracingIncludes: {
    '/**': ['./content/**/*', './CHANGELOG.md'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self), payment=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          ...(httpsDeployment
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains; preload',
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
