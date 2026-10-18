/** @type {import('next').NextConfig} */
import { readFileSync } from 'node:fs';

// Version + deploy commit are baked in at build time so /status can show them
// without reading the filesystem at request time.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

// HSTS and upgrade-insecure-requests tell the browser to switch to HTTPS for
// this host. That is only correct where the site actually is served over
// HTTPS — on a plain-http host (localhost, CI) they lock other engines out.
const httpsDeployment =
  process.env.NETLIFY === 'true' || (process.env.NEXT_PUBLIC_BASE_URL ?? '').startsWith('https://');

const csp = `default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://avatars.githubusercontent.com; font-src 'self'; media-src 'self' blob:; connect-src 'self' https://ipapi.co; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; ${httpsDeployment ? 'upgrade-insecure-requests; ' : ''}worker-src 'self' blob:;`;

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    APP_VERSION: pkg.version,
    COMMIT_REF: process.env.COMMIT_REF ?? '',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self)' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          ...(httpsDeployment
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains; preload',
                },
              ]
            : []),
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
