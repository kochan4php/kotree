'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { dayKey } from '@/lib/achievements';
import { VISITS_KEY } from '@/lib/lucky';

const DAYS_KEY = 'kotree-visit-days';
const DAYS_CAP = 400;
const VISITS_CAP = 40;

// M53/M54: local visit counts (feed the weighted "feeling lucky" picker) and
// the list of visiting days (feeds the streak). Browser-only, capped, and
// never sent anywhere.
export default function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith('/admin')) return; // the owner's visits must not skew the map
    try {
      const visits = JSON.parse(localStorage.getItem(VISITS_KEY) ?? '{}') as Record<string, unknown>;
      const counts: Record<string, number> =
        visits && typeof visits === 'object' && !Array.isArray(visits) ? (visits as Record<string, number>) : {};
      counts[pathname] = (Number(counts[pathname]) || 0) + 1;
      const keys = Object.keys(counts);
      for (const key of keys.slice(0, Math.max(0, keys.length - VISITS_CAP))) delete counts[key];
      localStorage.setItem(VISITS_KEY, JSON.stringify(counts));

      const rawDays = JSON.parse(localStorage.getItem(DAYS_KEY) ?? '[]');
      const days = Array.isArray(rawDays) ? rawDays.filter((day): day is string => typeof day === 'string') : [];
      const today = dayKey();
      if (!days.includes(today)) localStorage.setItem(DAYS_KEY, JSON.stringify([...days, today].slice(-DAYS_CAP)));
    } catch {
      // private mode — the map and streak just stay empty
    }
  }, [pathname]);

  return null;
}
