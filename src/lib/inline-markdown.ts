// M42: markdown-lite for guestbook messages — **bold**, *italic*, `code` and
// bare URLs. Inline only (messages are capped at 100 chars) and deliberately
// non-nesting. Output is a token list for React, never HTML: escaping is
// structural, so nothing a visitor types can inject markup.
export type InlineToken =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; href: string };

// Bold before italic so `**x**` never parses as two italics. A single `*`
// without a closing twin stays literal text.
const TOKEN_RE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*|https?:\/\/[^\s<>"'`*_]+)/g;

export function parseInline(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let last = 0;
  for (const match of input.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push({ type: 'text', text: input.slice(last, index) });
    const raw = match[0];
    if (raw.startsWith('**')) {
      tokens.push({ type: 'bold', text: raw.slice(2, -2) });
    } else if (raw.startsWith('`')) {
      tokens.push({ type: 'code', text: raw.slice(1, -1) });
    } else if (raw.startsWith('*')) {
      tokens.push({ type: 'italic', text: raw.slice(1, -1) });
    } else {
      // Trailing sentence punctuation belongs to the prose, not the URL
      const href = raw.replace(/[.,!?;:]+$/, '');
      tokens.push({ type: 'link', text: href, href });
      if (href.length < raw.length) tokens.push({ type: 'text', text: raw.slice(href.length) });
    }
    last = index + raw.length;
  }
  if (last < input.length) tokens.push({ type: 'text', text: input.slice(last) });
  return tokens;
}
