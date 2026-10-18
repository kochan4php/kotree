// M52: tiny shields-style SVG badges, built as strings so the route needs no
// library. Every piece of text is XML-escaped before it goes in.

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

export interface BadgeOptions {
  label: string;
  value: string;
  /** Value-box fill. Fixed palette values only — internal callers. */
  color?: string;
}

// Rough fixed metrics: 11px monospace ≈ 7px per character, 10px padding a side.
export function buildBadgeSvg({ label, value, color = '#ff7c47' }: BadgeOptions): string {
  const labelWidth = Math.round(label.length * 7 + 20);
  const valueWidth = Math.round(value.length * 7 + 20);
  const width = labelWidth + valueWidth;
  const name = escapeXml(`${label}: ${value}`);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${name}">` +
    `<rect width="${width}" height="20" fill="#f4ead9"/>` +
    `<rect x="2" y="2" width="${width - 4}" height="16" fill="#14110f"/>` +
    `<rect x="${labelWidth}" y="2" width="${valueWidth - 2}" height="16" fill="${color}"/>` +
    `<g font-family="monospace" font-size="11" font-weight="bold">` +
    `<text x="10" y="14" fill="#fff7e9">${escapeXml(label)}</text>` +
    `<text x="${labelWidth + 10}" y="14" fill="#14110f">${escapeXml(value)}</text>` +
    `</g></svg>`
  );
}
