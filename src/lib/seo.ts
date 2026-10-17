import { site } from './site';

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
