// K17: build-time search index of the content folders, so the command palette
// can search notes and projects (title, summary, tags), not just page names.
// Mirrors the tiny frontmatter parser used by gen-og.mjs.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function frontmatter(file) {
  const raw = fs.readFileSync(file, 'utf-8');
  const data = {};
  if (raw.startsWith('---')) {
    const end = raw.indexOf('\n---', 3);
    if (end !== -1) {
      const head = raw.slice(raw.indexOf('\n', 3), end);
      for (const line of head.split('\n')) {
        const i = line.indexOf(':');
        if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      }
    }
  }
  return data;
}

const entries = [];
for (const [dir, type, base] of [
  ['projects', 'project', '/projects/'],
  ['notes', 'note', '/notes/'],
]) {
  const full = path.join(__dirname, '..', 'content', dir);
  if (!fs.existsSync(full)) continue;
  for (const file of fs.readdirSync(full).filter((name) => name.endsWith('.md'))) {
    const slug = file.replace(/\.md$/, '');
    const data = frontmatter(path.join(full, file));
    entries.push({
      type,
      title: data.title ?? slug,
      summary: (data.summary ?? '').slice(0, 200),
      tags: (data.tags ?? '').split(',').map((tag) => tag.trim()).filter(Boolean),
      url: `${base}${slug}`,
    });
  }
}

const out = path.join(__dirname, '..', 'public', 'search-index.json');
fs.writeFileSync(out, `${JSON.stringify(entries, null, 2)}\n`);
console.log(`search-index.json: ${entries.length} entries`);
