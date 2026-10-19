'use client';

import { useEffect, useRef, useState } from 'react';
import { Highlighter } from 'lucide-react';
import { addHighlight, readShelf } from '@/lib/shelf';
import { captureAnchor, findAnchor, type Anchor } from '@/lib/highlight-anchor';

// G2: highlights, kept on the device. Selecting text inside the article shows
// one button; pressing it stores the quote (with a little context either side)
// and wraps it in a <mark>. On the next visit the quote is found again by its
// text and context, and dropped quietly when the words have changed under it.
// Marks are not interactive — they are managed from /shelf, where they can be
// read and removed without decorating the prose with hidden controls.

const MARK = 'kt-highlight';

interface TextMap {
  text: string;
  nodes: { node: Text; start: number }[];
}

function mapArticle(root: HTMLElement): TextMap {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.textContent && node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  });
  const nodes: TextMap['nodes'] = [];
  let text = '';
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const textNode = node as Text;
    nodes.push({ node: textNode, start: text.length });
    text += textNode.data;
  }
  return { text, nodes };
}

function nodeAt(map: TextMap, index: number): { node: Text; start: number } | null {
  let found: TextMap['nodes'][number] | null = null;
  for (const entry of map.nodes) {
    if (entry.start <= index) found = entry;
    else break;
  }
  return found;
}

// Where a DOM position sits in the article's flat text.
function locate(map: TextMap, container: Node, offset: number): number | null {
  if (container.nodeType === Node.TEXT_NODE) {
    const entry = map.nodes.find((item) => item.node === container);
    return entry ? entry.start + offset : null;
  }
  const child = container.childNodes[offset] ?? container.childNodes[offset - 1];
  if (!child) return null;
  const walker = document.createTreeWalker(child, NodeFilter.SHOW_TEXT);
  const first = walker.nextNode() as Text | null;
  const entry = first ? map.nodes.find((item) => item.node === first) : undefined;
  return entry ? entry.start : null;
}

function rangeFor(map: TextMap, start: number, end: number): Range | null {
  const first = nodeAt(map, start);
  const last = nodeAt(map, end - 1);
  if (!first || !last) return null;
  const range = document.createRange();
  range.setStart(first.node, Math.min(start - first.start, first.node.data.length));
  range.setEnd(last.node, Math.min(end - last.start, last.node.data.length));
  return range;
}

function wrapRange(range: Range): HTMLElement {
  const mark = document.createElement('mark');
  mark.className = MARK;
  mark.appendChild(range.extractContents());
  range.insertNode(mark);
  return mark;
}

export default function HighlightsLayer({ path, title }: { path: string; title: string }) {
  const article = useRef<HTMLElement | null>(null);
  const [pending, setPending] = useState<{ anchor: Anchor; left: number; top: number } | null>(null);

  // Put back whatever this device remembers, once, after hydration.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('main .e-content');
    if (!root) return;
    article.current = root;
    let alive = true;
    readShelf().then((shelf) => {
      if (!alive) return;
      for (const stored of shelf.highlights.filter((item) => item.path === path)) {
        const map = mapArticle(root);
        const found = findAnchor(map.text, stored);
        if (!found) continue;
        const range = rangeFor(map, found.start, found.end);
        if (range && !(range.startContainer.parentElement?.closest(`.${MARK}`))) wrapRange(range);
      }
    });
    return () => {
      alive = false;
    };
  }, [path]);

  // Watch selections over the article — pointer and keyboard alike.
  useEffect(() => {
    const onSelect = () => {
      const root = article.current ?? document.querySelector<HTMLElement>('main .e-content');
      const selection = window.getSelection();
      if (!root || !selection || selection.isCollapsed || selection.rangeCount === 0) {
        setPending(null);
        return;
      }
      const range = selection.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer) || !selection.toString().trim()) {
        setPending(null);
        return;
      }
      const quote = selection.toString().trim();
      if (quote.length < 3 || quote.length > 400) {
        setPending(null);
        return;
      }
      const map = mapArticle(root);
      const start = locate(map, range.startContainer, range.startOffset);
      const end = locate(map, range.endContainer, range.endOffset);
      const box = range.getBoundingClientRect();
      if (start === null || end === null || end <= start || (box.width === 0 && box.height === 0)) {
        setPending(null);
        return;
      }
      setPending({
        anchor: captureAnchor(map.text, start, end),
        left: Math.min(Math.max(box.left + box.width / 2, 72), window.innerWidth - 72),
        top: Math.max(box.top - 6, 56),
      });
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPending(null);
    };
    document.addEventListener('pointerup', onSelect);
    document.addEventListener('keyup', onSelect);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerup', onSelect);
      document.removeEventListener('keyup', onSelect);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!pending) return null;

  const save = async () => {
    const root = article.current;
    if (!root) return;
    const map = mapArticle(root);
    const found = findAnchor(map.text, pending.anchor);
    if (found) {
      const range = rangeFor(map, found.start, found.end);
      if (range) wrapRange(range);
      await addHighlight({ path, title, ...pending.anchor, at: new Date().toISOString() });
    }
    window.getSelection()?.removeAllRanges();
    setPending(null);
  };

  return (
    <button
      type="button"
      onClick={save}
      aria-label="Highlight the selected text"
      style={{ left: pending.left, top: pending.top }}
      className="print:hidden fixed z-70 -translate-x-1/2 -translate-y-full inline-flex items-center gap-1 rounded border-2 border-foreground bg-card px-2 py-1 text-[10px] font-black uppercase tracking-wider text-foreground shadow-[2px_2px_0_0_var(--foreground)] cursor-pointer hover:bg-secondary"
    >
      <Highlighter className="w-3 h-3" aria-hidden="true" />
      Highlight
    </button>
  );
}
