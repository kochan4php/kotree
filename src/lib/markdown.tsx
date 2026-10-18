import CodeCopy from '@/components/content/code-copy';
import HeadingAnchor from '@/components/content/heading-anchor';
import { styleOf } from '@/lib/css-vars';
import { Info, Lightbulb, OctagonAlert, ShieldAlert, TriangleAlert, type LucideIcon } from 'lucide-react';
import React from 'react';
import { slugifyHeading, type CalloutKind, type MarkdownBlock } from './markdown-parse';

// The parser moved to markdown-parse.ts (unit-testable without JSX, M38).
// Everything here re-exports the old surface so imports stay untouched.
export { extractHeadings, parseMarkdown, readingMinutes, slugifyHeading } from './markdown-parse';
export type { CalloutKind, MarkdownBlock } from './markdown-parse';

const CALLOUT_ICONS: Record<CalloutKind, LucideIcon> = {
  note: Info,
  tip: Lightbulb,
  important: ShieldAlert,
  warning: TriangleAlert,
  caution: OctagonAlert,
};

const CALLOUT_LABELS: Record<CalloutKind, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
};

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
    // Footnote reference: [^id] — a superscript linking to the footnote list
    if (text.startsWith('[^', i)) {
      const end = text.indexOf(']', i + 2);
      if (end !== -1) {
        flush();
        const id = text.slice(i + 2, end);
        parts.push(
          <sup key={key++}>
            <a
              href={`#fn-${id}`}
              id={`fnref-${id}`}
              aria-label={`Footnote ${id}`}
              className="font-bold text-accent-ink underline underline-offset-2 decoration-2"
            >
              {id}
            </a>
          </sup>
        );
        i = end;
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
    if (block.type === 'callout') {
      const Icon = CALLOUT_ICONS[block.kind];
      return (
        <aside key={key} className="kt-callout mt-4">
          <p className="kt-callout-label">
            <Icon className="h-4 w-4" aria-hidden="true" />
            {CALLOUT_LABELS[block.kind]}
          </p>
          <p className="kt-callout-text">{renderInline(block.text)}</p>
        </aside>
      );
    }
    if (block.type === 'table') {
      return (
        <div key={key} className="kt-table-wrap mt-4">
          <table className="kt-table">
            <thead>
              <tr>
                {block.head.map((cell, i) => (
                  <th key={i} scope="col" className="kt-th">
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className="kt-td">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    // M37: fenced code with a language label, a copy button and per-line ids
    // so a `#code-1-L3` fragment highlights the line (kt-hl or :target).
    if (block.type === 'code') {
      const label = block.lang || 'text';
      return (
        <figure key={key} id={`code-${key + 1}`} className="kt-code mt-4 scroll-mt-24">
          <figcaption className="kt-code-head">
            <span className="kt-code-lang">{label}</span>
            <CodeCopy code={block.lines.join('\n')} label={label} />
          </figcaption>
          <pre className="kt-code-pre">
            <code>
              {block.lines.map((line, n) => (
                <span
                  key={n}
                  id={`code-${key + 1}-L${n + 1}`}
                  className={`kt-code-line${block.highlight.includes(n + 1) ? ' kt-hl' : ''}`}
                >
                  {line === '' ? ' ' : line}
                </span>
              ))}
            </code>
          </pre>
        </figure>
      );
    }
    if (block.type === 'footnotes') {
      return (
        <section key={key} aria-label="Footnotes" className="kt-footnotes mt-8">
          <h2 className="text-sm font-black uppercase tracking-wider text-foreground">Footnotes</h2>
          <ol className="mt-2 space-y-2 list-decimal pl-5">
            {block.items.map((item) => (
              <li key={item.id} id={`fn-${item.id}`} className="scroll-mt-24 text-sm text-muted-foreground leading-relaxed">
                {renderInline(item.text)}{' '}
                <a
                  href={`#fnref-${item.id}`}
                  aria-label={`Back to reference ${item.id}`}
                  className="font-bold text-accent-ink underline underline-offset-2 decoration-2"
                >
                  ↩
                </a>
              </li>
            ))}
          </ol>
        </section>
      );
    }
    // Headings carry a stable id so the table of contents can link to them,
    // plus a named view-timeline for the CSS scroll-spy (M36) and a copy
    // link button.
    const Tag = block.type;
    const id = slugifyHeading(block.text, seen);
    return (
      <Tag
        key={key}
        id={id}
        style={styleOf({ viewTimelineName: `--kt-${id}` })}
        className={`${blockClasses[block.type]} scroll-mt-24`}
      >
        {renderInline(block.text)}
        <HeadingAnchor id={id} />
      </Tag>
    );
  });
}
