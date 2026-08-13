import type { Changelog, ChangelogBlock } from './parser';

const inlineBase = 'bg-muted/40 border border-border rounded px-1 py-0.5 text-[0.85em]';

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let current = '';
  let key = 0;
  const flush = () => { if (current) { parts.push(current); current = ''; } };

  for (let i = 0; i < text.length; i++) {
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) { flush(); parts.push(<strong key={key++}>{text.slice(i + 2, end)}</strong>); i = end + 1; continue; }
    }
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) { flush(); parts.push(<code key={key++} className={inlineBase}>{text.slice(i + 1, end)}</code>); i = end; continue; }
    }
    current += text[i];
  }
  flush();
  return parts;
}

const blockClasses: Record<string, string> = {
  h1: 'text-3xl font-bold tracking-tight text-foreground',
  h2: 'text-2xl font-bold tracking-tight text-foreground',
  h3: 'text-sm font-semibold uppercase tracking-wider text-accent mt-6 mb-3 first:mt-0',
  p: 'text-muted-foreground leading-relaxed mt-4 first:mt-0',
};

function renderBlock(block: ChangelogBlock, key: number): React.ReactNode {
  if (block.type === 'list') {
    return (
      <ul key={key} className="list-disc marker:text-accent pl-5 space-y-2">
        {block.items.map((item, i) => (
          <li key={i} className="text-foreground/90 leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold">
            {renderInline(item)}
          </li>
        ))}
      </ul>
    );
  }
  const Tag = block.type;
  return <Tag key={key} className={blockClasses[block.type]}>{renderInline(block.text)}</Tag>;
}

export function renderChangelog(
  changelog: Changelog
): { header: React.ReactNode[]; versions: { title: string; body: React.ReactNode[] }[] } {
  const render = (blocks: ChangelogBlock[]) => blocks.map((block, i) => renderBlock(block, i));
  return {
    header: render(changelog.header),
    versions: changelog.versions.map((version) => ({ title: version.title, body: render(version.blocks) })),
  };
}
