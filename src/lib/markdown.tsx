export type MarkdownBlock =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list'; items: string[] };

function headingLevel(line: string): 'h1' | 'h2' | 'h3' | null {
  if (line.startsWith('### ')) return 'h3';
  if (line.startsWith('## ')) return 'h2';
  if (line.startsWith('# ')) return 'h1';
  return null;
}

// Markdown-lite, same flavour as the changelog parser: headings, paragraphs,
// blockquotes and dash lists. Inline **bold**, *italic*, `code` and
// [links](url) are handled by the renderer.
// Stable heading anchors (K19): same slug algorithm the TOC links against,
// with a counter so repeated headings never collide.
function slugifyHeading(text: string, seen: Map<string, number>): string {
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

// Plain word count / 200, never "0 min". Used next to the date on articles.
export function readingMinutes(blocks: MarkdownBlock[]): number {
  const words = blocks.reduce((sum, block) => {
    const text = block.type === 'list' ? block.items.join(' ') : block.text;
    return sum + text.split(/\s+/).filter(Boolean).length;
  }, 0);
  return Math.max(1, Math.round(words / 200));
}

export function parseMarkdown(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (list.length) {
      blocks.push({ type: 'list', items: list });
      list = [];
    }
  };

  for (const line of content.split(/\r?\n/)) {
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
  return blocks;
}

const inlineBase = 'bg-secondary border-2 border-foreground rounded px-1 py-0.5 text-[0.85em] font-mono font-bold';

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let current = '';
  let key = 0;
  const flush = () => {
    if (current) {
      parts.push(current);
      current = '';
    }
  };

  for (let i = 0; i < text.length; i++) {
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        flush();
        parts.push(<strong key={key++}>{text.slice(i + 2, end)}</strong>);
        i = end + 1;
        continue;
      }
    }
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        flush();
        parts.push(
          <code key={key++} className={inlineBase}>
            {text.slice(i + 1, end)}
          </code>
        );
        i = end;
        continue;
      }
    }
    if (text.startsWith('[', i)) {
      const mid = text.indexOf('](', i + 1);
      const end = mid === -1 ? -1 : text.indexOf(')', mid + 2);
      if (end !== -1) {
        flush();
        const label = text.slice(i + 1, mid);
        const href = text.slice(mid + 2, end);
        const external = /^https?:/i.test(href);
        parts.push(
          <a
            key={key++}
            href={href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="font-bold text-accent-ink underline underline-offset-2 decoration-2 hover:decoration-[3px]"
          >
            {label}
          </a>
        );
        i = end;
        continue;
      }
    }
    if (text[i] === '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1 && end > i + 1) {
        flush();
        parts.push(<em key={key++}>{text.slice(i + 1, end)}</em>);
        i = end;
        continue;
      }
    }
    current += text[i];
  }
  flush();
  return parts;
}

const blockClasses: Record<string, string> = {
  h1: 'text-3xl font-black tracking-tight text-foreground',
  h2: 'text-2xl font-black tracking-tight text-foreground mt-6',
  h3: 'text-lg font-black tracking-tight text-foreground mt-5',
  p: 'text-muted-foreground leading-relaxed mt-4',
};

export function renderMarkdown(blocks: MarkdownBlock[]): React.ReactNode[] {
  const seen = new Map<string, number>();
  return blocks.map((block, key) => {
    if (block.type === 'list') {
      return (
        <ul key={key} className="list-disc marker:text-accent pl-5 space-y-2 mt-4">
          {block.items.map((item, i) => (
            <li key={i} className="text-foreground/90 leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
    }
    if (block.type === 'quote') {
      return (
        <blockquote key={key} className="mt-4 border-l-4 border-accent pl-4 italic text-muted-foreground leading-relaxed">
          {renderInline(block.text)}
        </blockquote>
      );
    }
    if (block.type === 'p') {
      return (
        <p key={key} className={blockClasses.p}>
          {renderInline(block.text)}
        </p>
      );
    }
    // Headings carry a stable id so the table of contents can link to them
    const Tag = block.type;
    return (
      <Tag key={key} id={slugifyHeading(block.text, seen)} className={`${blockClasses[block.type]} scroll-mt-24`}>
        {renderInline(block.text)}
      </Tag>
    );
  });
}
