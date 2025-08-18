// app/sitemap.ts
import { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      lastModified: new Date().toISOString().split('T')[0],
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
