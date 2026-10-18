'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Award, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { SECRETS, VETERAN_KEY, discoveredSecrets } from '@/lib/secrets';
import {
  ACHIEVEMENTS,
  DAY_RE,
  PROGRESS_KEYS,
  dayKey,
  sanitizeProgress,
  streakFrom,
  type AchievementState,
} from '@/lib/achievements';

const DAYS_KEY = 'kotree-visit-days';
const QUIZ_KEY = 'kotree-quiz-best';

function readDays(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(DAYS_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((day): day is string => typeof day === 'string') : [];
  } catch {
    return [];
  }
}

function readPollVoted(): boolean {
  try {
    const raw = JSON.parse(localStorage.getItem(PROGRESS_KEYS.pollVoted) ?? '{}');
    return Boolean(raw && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length > 0);
  } catch {
    return false;
  }
}

function readState(): AchievementState {
  const found = discoveredSecrets();
  try {
    const quizBest = Number(localStorage.getItem(QUIZ_KEY)) || 0;
    const veteran = Boolean(localStorage.getItem(VETERAN_KEY));
    return {
      secretsFound: found.length,
      totalSecrets: SECRETS.length,
      streak: streakFrom(readDays(), dayKey()),
      veteran,
      quizBest,
      pollVoted: readPollVoted(),
      explored: found.includes('explore'),
    };
  } catch {
    return {
      secretsFound: found.length,
      totalSecrets: SECRETS.length,
      streak: 0,
      veteran: false,
      quizBest: 0,
      pollVoted: false,
      explored: found.includes('explore'),
    };
  }
}

// M54: streak + badge cabinet with export/import of the local-only progress.
export default function AchievementsPanel() {
  const [state, setState] = useState<AchievementState | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => setState(readState()), []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only store, applied after mount by design
    refresh();
    window.addEventListener('kotree:secrets', refresh);
    window.addEventListener('kotree:prefs', refresh);
    return () => {
      window.removeEventListener('kotree:secrets', refresh);
      window.removeEventListener('kotree:prefs', refresh);
    };
  }, [refresh]);

  const exportProgress = () => {
    try {
      const payload = {
        app: 'kotree',
        version: 1,
        exportedAt: new Date().toISOString(),
        secrets: discoveredSecrets(),
        visitDays: readDays(),
        quizBest: Number(localStorage.getItem(QUIZ_KEY)) || 0,
        veteran: Boolean(localStorage.getItem(VETERAN_KEY)),
        pollVoted: readPollVoted(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'kotree-progress.json';
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('Progress exported');
    } catch {
      toast.error('Storage is blocked in this browser');
    }
  };

  const importProgress = async (file: File) => {
    if (file.size > 64 * 1024) {
      toast.error('That file is far too large to be a progress export');
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      toast.error('Could not read that file as JSON');
      return;
    }
    const clean = sanitizeProgress(raw);
    if (!clean) {
      toast.error('That does not look like a Kotree progress file');
      return;
    }
    try {
      localStorage.setItem(PROGRESS_KEYS.secrets, JSON.stringify(clean.secrets));
      localStorage.setItem(DAYS_KEY, JSON.stringify(clean.visitDays.filter((day) => DAY_RE.test(day))));
      localStorage.setItem(QUIZ_KEY, String(clean.quizBest));
      if (clean.veteran) localStorage.setItem(VETERAN_KEY, '1');
      // The poll key is a per-poll map; one sentinel row keeps the "voted" flag
      if (clean.pollVoted) localStorage.setItem(PROGRESS_KEYS.pollVoted, JSON.stringify({ imported: '1970-01-01' }));
    } catch {
      toast.error('Storage is blocked in this browser');
      return;
    }
    refresh();
    window.dispatchEvent(new CustomEvent('kotree:secrets', { detail: clean.secrets.length }));
    toast.success('Progress imported');
  };

  const earned = state ? ACHIEVEMENTS.filter((badge) => badge.earned(state)) : [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg border-[3px] border-foreground px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider shadow-[3px_3px_0_0_var(--foreground)] ${
            (state?.streak ?? 0) > 0 ? 'bg-accent text-accent-foreground' : 'bg-foreground text-background'
          }`}
        >
          🔥 {state?.streak ?? 0}-day streak
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border-[3px] border-foreground bg-card px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-foreground shadow-[3px_3px_0_0_var(--foreground)]">
          <Award className="w-3.5 h-3.5 text-accent-ink" aria-hidden="true" />
          {earned.length}/{ACHIEVEMENTS.length} badges
        </span>
        <span role="status" className="sr-only">
          {earned.length} of {ACHIEVEMENTS.length} achievements earned
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={exportProgress}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-foreground bg-secondary px-2.5 py-1.5 text-[11px] font-bold text-foreground shadow-[2px_2px_0_0_var(--foreground)] transition-transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" /> Export
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-foreground bg-secondary px-2.5 py-1.5 text-[11px] font-bold text-foreground shadow-[2px_2px_0_0_var(--foreground)] transition-transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" /> Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            aria-label="Import progress file"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importProgress(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {ACHIEVEMENTS.map((badge) => {
          const unlocked = state ? badge.earned(state) : false;
          return (
            <li
              key={badge.id}
              className={`flex items-start gap-2.5 rounded-xl border-[3px] border-foreground p-2.5 shadow-[3px_3px_0_0_var(--foreground)] ${
                unlocked ? 'bg-accent text-accent-foreground' : 'bg-secondary/60 text-muted-foreground'
              }`}
            >
              <span aria-hidden="true" className={`text-lg leading-none ${unlocked ? '' : 'grayscale opacity-60'}`}>
                {badge.emoji}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-black uppercase tracking-wider">
                  {unlocked ? badge.name : 'Locked'}
                </span>
                <span className={`block text-[11px] font-medium leading-snug ${unlocked ? '' : 'text-muted-foreground'}`}>
                  {badge.description}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
