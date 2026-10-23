// M84: just enough colour maths for the free accent picker — WCAG relative
// luminance, contrast ratios, and an ink/foreground derivation that is
// guaranteed to clear AA before anything ever reaches the DOM. No dependency.

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface AccentDerivation {
  /** The picked colour, normalised to lowercase #rrggbb. */
  hex: string;
  /** Accent text/icons ink, validated against the light theme's hardest surface. */
  inkLight: string;
  /** Text colour for the accent sticker itself (dark ink or cream, best of the two). */
  foreground: string;
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function parseHex(hex: unknown): Rgb | null {
  if (typeof hex !== 'string' || !HEX.test(hex)) return null;
  // #abc is #aabbcc — minified CSS hands tokens back in short form
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  return {
    r: parseInt(full.slice(1, 3), 16),
    g: parseInt(full.slice(3, 5), 16),
    b: parseInt(full.slice(5, 7), 16),
  };
}

const toHex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;

const linear = (channel: number) => {
  const scaled = channel / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
};

export function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrastRatio(a: string, b: string): number {
  const first = parseHex(a);
  const second = parseHex(b);
  if (!first || !second) return 0;
  const [lighter, darker] = [luminance(first), luminance(second)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

// The hardest surface is the prefers-contrast: more variant, so one derivation
// holds for every light background the accent ink can sit on.
export const INK_SURFACES = { light: '#ecdcbe' } as const;

const mix = (rgb: Rgb, target: number, amount: number): Rgb => ({
  r: rgb.r + (target - rgb.r) * amount,
  g: rgb.g + (target - rgb.g) * amount,
  b: rgb.b + (target - rgb.b) * amount,
});

// Walk toward black until AA is met on the light surface.
function inkFor(hex: string): string {
  const rgb = parseHex(hex)!;
  for (let step = 0; step <= 40; step++) {
    const candidate = toHex(mix(rgb, 0, step / 40));
    if (contrastRatio(candidate, INK_SURFACES.light) >= 4.5) return candidate;
  }
  return toHex(mix(rgb, 0, 1));
}

// Prefer the brand inks (near-black or cream); at the luminance crossover
// both can dip toward ~4.1:1, so those cases fall back to pure black/white —
// whose worst case is sqrt(21) ≈ 4.58:1, comfortably AA.
export function accentForeground(hex: string): string {
  const brand = contrastRatio(hex, '#14110f') >= contrastRatio(hex, '#fff7e9') ? '#14110f' : '#fff7e9';
  if (contrastRatio(hex, brand) >= 4.5) return brand;
  return contrastRatio(hex, '#000000') >= contrastRatio(hex, '#ffffff') ? '#000000' : '#ffffff';
}

/** Returns null for malformed input — the caller keeps the preset then. */
export function deriveAccent(hex: unknown): AccentDerivation | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const normalized = toHex(rgb);
  return {
    hex: normalized,
    inkLight: inkFor(normalized),
    foreground: accentForeground(normalized),
  };
}
