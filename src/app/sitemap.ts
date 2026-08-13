import type { MetadataRoute } from 'next';
import { execSync } from 'child_process';
import { site } from '@/lib/site';

// Real last-modified dates from git (falls back to build time on shallow clones)
function lastModified(file?: string): string {
  try {
    const out = execSync(`git log -1 --format=%cI ${file ? `-- ${file}` : ''}`, {
      encoding: 'utf8',
    }).trim();
    if (out) return out;
  } catch {
    // shallow clone or no git — build time is the best we have
  }
  return new Date().toISOString();
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.baseUrl, lastModified: lastModified(), changeFrequency: 'weekly', priority: 1 },
    { url: `${site.baseUrl}/changelog`, lastModified: lastModified('CHANGELOG.md'), changeFrequency: 'monthly', priority: 0.5 },
  ];
}
