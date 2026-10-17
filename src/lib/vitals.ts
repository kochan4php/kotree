// Core Web Vitals thresholds, shared by the /api/vitals route (rating incoming
// samples) and the data layer (rating p75 aggregates for the admin).
export type VitalRating = 'good' | 'ni' | 'poor';

export const VITAL_THRESHOLDS: Record<string, { poor: number; good: number }> = {
  LCP: { poor: 4000, good: 2500 },
  CLS: { poor: 0.25, good: 0.1 },
  INP: { poor: 500, good: 200 },
  TTFB: { poor: 1800, good: 800 },
  FCP: { poor: 3000, good: 1800 },
};

export function rateVital(metric: string, value: number): VitalRating {
  const threshold = VITAL_THRESHOLDS[metric];
  if (!threshold) return 'ni';
  return value > threshold.poor ? 'poor' : value > threshold.good ? 'ni' : 'good';
}
