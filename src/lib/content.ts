import fs from 'fs';
import path from 'path';

// Build-time content: markdown files with a tiny frontmatter header.
// Everything here runs on the server (static generation), never in a client
// bundle.

export interface Project {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  links: { label: string; url: string }[];
  body: string;
}

export interface Note {
  slug: string;
  title: string;
  date: string;
  summary: string;
  body: string;
}

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  if (!raw.startsWith('---')) return { data: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: raw };
  const head = raw.slice(raw.indexOf('\n', 3), end);
  const body = raw.slice(end + 4).replace(/^\r?\n+/, '');
  const data: Record<string, string> = {};
  for (const line of head.split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { data, body };
}

function readMarkdownDir(dir: string): { slug: string; data: Record<string, string>; body: string }[] {
  // 'content' is spelled out so the bundler can statically scope the trace
  const full = path.join(process.cwd(), 'content', dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const { data, body } = parseFrontmatter(fs.readFileSync(path.join(full, f), 'utf-8'));
      return { slug: f.replace(/\.md$/, ''), data, body };
    });
}

const byDateDesc = (a: { date: string }, b: { date: string }) => (a.date < b.date ? 1 : -1);

export function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function getProjects(): Project[] {
  return readMarkdownDir('projects')
    .map(({ slug, data, body }) => ({
      slug,
      title: data.title ?? slug,
      summary: data.summary ?? '',
      date: data.date ?? '',
      tags: (data.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean),
      links: (data.links ?? '')
        .split(',')
        .map((pair) => {
          const [label, url] = pair.split('|').map((s) => s.trim());
          return label && url ? { label, url } : null;
        })
        .filter((l): l is { label: string; url: string } => l !== null),
      body,
    }))
    .sort(byDateDesc);
}

export function getProject(slug: string): Project | undefined {
  return getProjects().find((p) => p.slug === slug);
}

export function getNotes(): Note[] {
  return readMarkdownDir('notes')
    .map(({ slug, data, body }) => ({
      slug,
      title: data.title ?? slug,
      date: data.date ?? '',
      summary: data.summary ?? '',
      body,
    }))
    .sort(byDateDesc);
}

export function getNote(slug: string): Note | undefined {
  return getNotes().find((n) => n.slug === slug);
}
