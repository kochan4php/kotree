import type { CSSProperties } from 'react';

// M36: cssstype/React types lag behind scroll-driven animations, so the two
// view-timeline properties are written through one typed helper.
export function styleOf(vars: Record<string, string | number>): CSSProperties {
  return vars as unknown as CSSProperties;
}
