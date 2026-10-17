import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

// K22: AI assistants may read and cite the site; mass SEO/aggregator scrapers
// may not. The polite ones get pointed at the sitemap and /llms.txt.
const FRIENDLY_BOTS = [
  'GPTBot',
  'ClaudeBot',
  'Claude-Web',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'cohere-ai',
];

const SCRAPERS = ['Bytespider', 'CCBot', 'AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot', 'DataForSeoBot', 'PetalBot'];

export default function robots(): MetadataRoute.Robots {
  const disallow = ['/api/', '/admin', '/status'];
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      { userAgent: FRIENDLY_BOTS, allow: '/', disallow },
      { userAgent: SCRAPERS, disallow: '/' },
    ],
    sitemap: `${site.baseUrl}/sitemap.xml`,
  };
}
