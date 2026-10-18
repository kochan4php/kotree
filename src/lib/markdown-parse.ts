// The markdown-lite parser, split from the renderer so it can be unit-tested
// without JSX (tests/unit/markdown.test.ts). Same flavour as the changelog
// parser, promoted with the v2 blocks: fenced code, GFM tables, callouts and
// footnotes (M37/M38).

export type CalloutKind = 'note' | 'tip' | 'important' | 'warning' | 'caution';

export type MarkdownBlock =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'code'; lang: string; lines: string[]; highlight: number[] }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'callout'; kind: CalloutKind; text: string }
  | { type: 'footnotes'; items: { id: string; text: string }[] };

const CALLOUT_KINDS: readonly string[] = ['note', 'tip', 'important', 'warning', 'caution'];

function headingLevel(line: string): 'h1' | 'h2' | 'h3' | null {
  if (line.startsWith('### ')) return 'h3';
  if (line.startsWith('## ')) return 'h2';
  if (line.startsWith('# ')) return 'h1';
  return null;
}

// Stable heading anchors (K19): same slug algorithm the TOC links against,
// with a counter so repeated headings never collide.
export function slugifyHeading(text: string, seen: Map<string, number>): string {
  const base =
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section';
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

// The TOC needs the same ids renderMarkdown will emit for the headings.
export function extractHeadings(blocks: MarkdownBlock[]): { id: string; text: string; level: 'h2' | 'h3' }[] {
  const seen = new Map<string, number>();
  const headings: { id: string; text: string; level: 'h2' | 'h3' }[] = [];
  for (const block of blocks) {
    if (block.type === 'h1' || block.type === 'h2' || block.type === 'h3') {
      const id = slugifyHeading(block.text, seen);
      if (block.type !== 'h1') headings.push({ id, text: block.text, level: block.type });
    }
  }
  return headings;
}

// A fence info string like `ts {1,3-5}` → [1, 3, 4, 5]
function parseHighlight(spec: string | undefined): number[] {
  const match = /^\{([\d,\s-]+)\}$/.exec(spec ?? '');
  if (!match) return [];
  const out = new Set<number>();
  for (const part of match[1].split(',')) {
    const piece = part.trim();
    if (!piece) continue;
    const range = /^(\d+)-(\d+)$/.exec(piece);
    if (range) {
      for (let n = Number(range[1]); n <= Number(range[2]); n++) out.add(n);
    } else if (/^\d+$/.test(piece)) {
      out.add(Number(piece));
    }
  }
  return [...out].sort((a, b) => a - b);
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.includes('|') && trimmed.includes('-') && /^[|\s:-]+$/.test(trimmed);
}

export function parseMarkdown(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = content.split(/\r?\n/);
  const footnotes = new Map<string, string>();
  let list: string[] = [];

  const flushList = () => {
    if (list.length) {
      blocks.push({ type: 'list', items: list });
      list = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Footnote definitions are collected and rendered as one block at the end
    const footnote = /^\[\^([^\]]+)\]:\s*(.+)$/.exec(line.trim());
    if (footnote) {
      flushList();
      footnotes.set(footnote[1], footnote[2].trim());
      continue;
    }

    // Fenced code: ```lang {1,3-5}
    const fence = line.trim().startsWith('```') ? line.trim().slice(3).trim() : null;
    if (fence !== null) {
      flushList();
      const codeLines: string[] = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith('```'); i++) codeLines.push(lines[i]);
      const [lang, spec] = fence.split(/\s+/);
      blocks.push({ type: 'code', lang: lang ?? '', lines: codeLines, highlight: parseHighlight(spec) });
      continue;
    }

    // GFM table: a pipe row directly above the separator row
    if (line.trim().startsWith('|') && isTableSeparator(lines[i + 1] ?? '')) {
      flushList();
      const head = splitTableRow(line);
      const rows: string[][] = [];
      for (i += 2; i < lines.length && lines[i].trim().startsWith('|'); i++) rows.push(splitTableRow(lines[i]));
      i--;
      blocks.push({ type: 'table', head, rows });
      continue;
    }

    // Callouts: > [!WARNING] followed by more > lines
    const callout = /^>\s*\[!(\w+)\]\s*(.*)$/.exec(line);
    if (callout) {
      flushList();
      const kind = callout[1].toLowerCase();
      const parts = [callout[2].trim()];
      while (i + 1 < lines.length && lines[i + 1].trimStart().startsWith('>')) {
        parts.push(lines[i + 1].trimStart().slice(1).trim());
        i++;
      }
      blocks.push({
        type: 'callout',
        kind: (CALLOUT_KINDS.includes(kind) ? kind : 'note') as CalloutKind,
        text: parts.filter(Boolean).join(' '),
      });
      continue;
    }

    const level = headingLevel(line);
    if (level) {
      flushList();
      blocks.push({ type: level, text: line.slice(level === 'h3' ? 4 : level === 'h2' ? 3 : 2) });
    } else if (line.startsWith('- ')) {
      list.push(line.slice(2));
    } else if (line.startsWith('> ')) {
      flushList();
      blocks.push({ type: 'quote', text: line.slice(2) });
    } else if (line.trim() !== '') {
      flushList();
      blocks.push({ type: 'p', text: line });
    }
  }
  flushList();

  if (footnotes.size) {
    blocks.push({ type: 'footnotes', items: [...footnotes].map(([id, text]) => ({ id, text })) });
  }
  return blocks;
}

// Plain word count / 200, never "0 min". Used next to the date on articles.
// Code lines are excluded — they are not prose.
export function readingMinutes(blocks: MarkdownBlock[]): number {
  const words = blocks.reduce((sum, block) => {
    if (block.type === 'code') return sum;
    if (block.type === 'list') return sum + block.items.join(' ').split(/\s+/).filter(Boolean).length;
    if (block.type === 'table') {
      return sum + [block.head, ...block.rows].flat().join(' ').split(/\s+/).filter(Boolean).length;
    }
    if (block.type === 'footnotes') {
      return sum + block.items.map((item) => item.text).join(' ').split(/\s+/).filter(Boolean).length;
    }
    return sum + block.text.split(/\s+/).filter(Boolean).length;
  }, 0);
  return Math.max(1, Math.round(words / 200));
}
