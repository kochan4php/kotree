// G2: anchors for stored highlights. A quote is found again by its text plus
// the words around it, so a sentence that appears twice still lands in the
// right place — and a quote that cannot be placed is dropped, never guessed.

export interface Anchor {
  text: string;
  /** Up to 48 characters before the quote, as they read when it was made. */
  before: string;
  after: string;
}

export function captureAnchor(pageText: string, start: number, end: number, span = 48): Anchor {
  return {
    text: pageText.slice(start, end),
    before: pageText.slice(Math.max(0, start - span), start),
    after: pageText.slice(end, end + span),
  };
}

export function findAnchor(haystack: string, anchor: Anchor): { start: number; end: number } | null {
  const { text, before, after } = anchor;
  if (!text.trim()) return null;

  const starts: number[] = [];
  for (let at = haystack.indexOf(text); at !== -1; at = haystack.indexOf(text, at + 1)) starts.push(at);

  if (starts.length === 0) return null;
  if (starts.length === 1) return { start: starts[0], end: starts[0] + text.length };

  const beforeFits = (start: number) => haystack.slice(Math.max(0, start - before.length), start) === before;
  const afterFits = (start: number) =>
    haystack.slice(start + text.length, start + text.length + after.length) === after;

  // Both sides of the context is the answer; one side still beats a guess.
  const both = starts.find((start) => beforeFits(start) && afterFits(start));
  const either = both ?? starts.find((start) => beforeFits(start) || afterFits(start));
  return either === undefined ? null : { start: either, end: either + text.length };
}
