// G3: the project page's repository card reads GitHub through our own cached
// route. The two decisions worth testing — which slugs are legal and which
// numbers reach the browser — live here as pure functions.

export interface RepoStats {
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  language: string | null;
  pushedAt: string | null;
}

// GitHub's own limits: 39 characters for an owner, 100 for a repository name.
const SLUG = /^[A-Za-z0-9._-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;

/** A GitHub `owner/name` slug, or null when the value is not one. */
export function repoSlug(value: string | null | undefined): string | null {
  return value && SLUG.test(value) ? value : null;
}

/** Only the numbers the card shows, so nothing else from the API leaks out. */
export function shapeRepo(payload: unknown): RepoStats | null {
  if (!payload || typeof payload !== 'object') return null;
  const repo = payload as Record<string, unknown>;
  if (typeof repo.full_name !== 'string') return null;
  const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
  return {
    fullName: repo.full_name,
    description: typeof repo.description === 'string' ? repo.description : null,
    stars: count(repo.stargazers_count),
    forks: count(repo.forks_count),
    openIssues: count(repo.open_issues_count),
    language: typeof repo.language === 'string' ? repo.language : null,
    pushedAt: typeof repo.pushed_at === 'string' ? repo.pushed_at : null,
  };
}
