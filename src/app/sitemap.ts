import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${site.baseUrl}/changelog`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];
}
