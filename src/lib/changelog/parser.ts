export type ChangelogBlock =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] };

export interface ChangelogVersion {
  title: string;
  blocks: ChangelogBlock[];
}

export interface Changelog {
  header: ChangelogBlock[];
  versions: ChangelogVersion[];
}

// K25: versions get a plain-number anchor (/changelog#3.3.0) so the "what's
// new" toast, copied links and feeds all point somewhere stable. The channel
// suffix stays in the heading, not in the id.
export function versionId(title: string): string {
  return title
    .replace(/[[\]]/g, '')
    .trim()
    .split(/\s+/)[0]
    .replace(/-[a-z][a-z0-9.]*$/i, '');
}

function headingLevel(line: string): 'h1' | 'h2' | 'h3' | null {
  if (line.startsWith('### ')) return 'h3';
  if (line.startsWith('## ')) return 'h2';
  if (line.startsWith('# ')) return 'h1';
  return null;
}

export function parseChangelog(content: string): Changelog {
  const header: ChangelogBlock[] = [];
  const versions: ChangelogVersion[] = [];
  let list: string[] = [];
  let blocks: ChangelogBlock[] = [];
  let title = '';
  let inVersion = false;

  const flushList = () => {
    if (list.length) {
      blocks.push({ type: 'list', items: list });
      list = [];
    }
  };

  // CRLF files (CHANGELOG is one) would otherwise leak \r into every line
  for (const line of content.split(/\r?\n/)) {
    const level = headingLevel(line);

    if (line.startsWith('## ')) {
      flushList();
      if (inVersion) versions.push({ title, blocks });
      else header.push(...blocks);
      title = line.slice(3);
      blocks = [];
      inVersion = true;
    } else if (level) {
      flushList();
      blocks.push({ type: level, text: line.slice(level === 'h3' ? 4 : level === 'h2' ? 3 : 2) });
    } else if (line.startsWith('- ')) {
      list.push(line.slice(2));
    } else if (line.trim() !== '') {
      flushList();
      blocks.push({ type: 'p', text: line });
    }
  }
  flushList();
  if (inVersion) versions.push({ title, blocks });
  else header.push(...blocks);

  return { header, versions };
}