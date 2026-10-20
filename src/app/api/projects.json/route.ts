import { getProjects } from '@/lib/content';
import { jsonWithEtag } from '@/lib/http-cache';

// Public, versioned content API: metadata only. Project bodies stay on the
// rendered page so the JSON contract is cheap to cache and easy to consume.
export async function GET(request: Request) {
  const projects = getProjects().map((project) => ({
    slug: project.slug,
    title: project.title,
    date: project.date,
    updated: project.updated,
    summary: project.summary,
    tags: project.tags,
    links: project.links,
    repo: project.repo,
    kind: project.kind,
    url: `/projects/${project.slug}`,
  }));
  const response = jsonWithEtag(request, { version: 1, projects }, 'public, s-maxage=300, stale-while-revalidate=3600');
  response.headers.set('Access-Control-Allow-Origin', '*');
  return response;
}
