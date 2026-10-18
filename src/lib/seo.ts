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

const authorNode = { '@type': 'Person', name: site.name, url: site.baseUrl };

// M31: article-level structured data for notes.
export function blogPostingLd(note: {
  slug: string;
  title: string;
  summary: string;
  date: string;
  updated?: string;
  tags: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: note.title,
    description: note.summary,
    image: `${site.baseUrl}/og/note-${note.slug}.png`,
    datePublished: note.date,
    ...(note.updated ? { dateModified: note.updated } : {}),
    ...(note.tags.length > 0 ? { keywords: note.tags } : {}),
    author: authorNode,
    mainEntityOfPage: `${site.baseUrl}/notes/${note.slug}`,
    url: `${site.baseUrl}/notes/${note.slug}`,
  };
}

// M31: projects are CreativeWork; ones marked `kind: app` are applications.
export function creativeWorkLd(project: {
  slug: string;
  title: string;
  summary: string;
  date: string;
  updated?: string;
  tags: string[];
  kind?: 'app';
}) {
  return {
    '@context': 'https://schema.org',
    '@type': project.kind === 'app' ? 'WebApplication' : 'CreativeWork',
    name: project.title,
    description: project.summary,
    image: `${site.baseUrl}/og/project-${project.slug}.png`,
    datePublished: project.date,
    ...(project.updated ? { dateModified: project.updated } : {}),
    ...(project.tags.length > 0 ? { keywords: project.tags } : {}),
    author: authorNode,
    url: `${site.baseUrl}/projects/${project.slug}`,
  };
}

// M31: tag pages are CollectionPages with the tagged items as an ItemList.
export function collectionPageLd(name: string, path: string, items: { title: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url: `${site.baseUrl}${path}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.title,
        url: item.url,
      })),
    },
  };
}
