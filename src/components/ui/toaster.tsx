'use client';

import { useSyncExternalStore } from 'react';
import { AlertTriangle, Check, Info, MessageSquare, X } from 'lucide-react';
import { dismissToast, getToasts, subscribeToasts, type ToastKind } from '@/lib/toast';

const LOOK: Record<ToastKind, { bg: string; tone: string; icon: typeof Check }> = {
  success: { bg: 'bg-[#dcf7c4]', tone: 'text-green-700', icon: Check },
  error: { bg: 'bg-[#ffd6d6]', tone: 'text-red-600', icon: AlertTriangle },
  info: { bg: 'bg-[#d6ecff]', tone: 'text-blue-600', icon: Info },
  message: { bg: 'bg-[#ffe6d1]', tone: 'text-accent-ink', icon: MessageSquare },
};

export default function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[9500] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((item) => {
        const look = LOOK[item.kind];
        const Icon = look.icon;
        return (
          <div
            key={item.key}
            role="status"
            className={`kt-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-xl border-[3px] border-foreground px-4 py-3 shadow-[4px_4px_0_0_var(--foreground)] ${look.bg}`}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${look.tone}`} aria-hidden="true" />
            <div className="flex-1">
              <p className="font-display text-sm font-black text-[#14110f]">{item.message}</p>
              {item.description && <p className="mt-0.5 text-xs font-medium text-[#14110f]/70">{item.description}</p>}
              {item.action && (
                <button
                  type="button"
                  onClick={() => {
                    item.action?.onClick();
                    dismissToast(item.id);
                  }}
                  className="mt-2 cursor-pointer rounded-md border-2 border-foreground bg-foreground px-4 py-1.5 text-xs font-bold text-background transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {item.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              aria-label="Dismiss notification"
              className="-mr-1 -mt-0.5 cursor-pointer rounded p-0.5 text-[#14110f]/60 transition-colors hover:bg-black/10 hover:text-[#14110f]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
