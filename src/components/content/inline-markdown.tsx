import { parseInline } from '@/lib/inline-markdown';

// M42: renders markdown-lite tokens as React text nodes. Links are the only
// nodes that become interactive, and only for http(s) hrefs the parser
// produced — everything else is untouched text.
export default function InlineMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {parseInline(text).map((token, i) => {
        switch (token.type) {
          case 'bold':
            return <strong key={i}>{token.text}</strong>;
          case 'italic':
            return <em key={i}>{token.text}</em>;
          case 'code':
            return (
              <code key={i} className="rounded border border-foreground/30 bg-card px-1 font-mono text-[0.95em]">
                {token.text}
              </code>
            );
          case 'link':
            return (
              <a
                key={i}
                href={token.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-ink underline underline-offset-2 decoration-2"
              >
                {token.text}
              </a>
            );
          default:
            return token.text;
        }
      })}
    </span>
  );
}
