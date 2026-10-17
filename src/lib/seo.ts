import type { Metadata } from 'next';
import { site } from './site';

// Per-page share card, pre-rendered at build time by scripts/gen-og.mjs
// into public/og/<name>.png. og:title/og:description fall back to the page
// title/description automatically.
export function pageOg(name: string, alt: string): Pick<Metadata, 'openGraph' | 'twitter'> {
  const image = `${site.baseUrl}/og/${name}.png`;
  return {
    openGraph: { images: [{ url: image, width: 1200, height: 630, alt }] },
    twitter: { card: 'summary_large_image', images: [image] },
  };
}

// Two-level BreadcrumbList (Home → page) for sub-pages that sit one level
// deep. Rendered as JSON-LD next to the page content.
export function breadcrumbLd(name: string, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: site.baseUrl },
      { '@type': 'ListItem', position: 2, name, item: `${site.baseUrl}${path}` },
    ],
  };
}
