'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarHeart, Bell, Check, Settings2, Sparkles, Sun, Type, Volume2, VolumeX, Waves } from 'lucide-react';
import { ACCENTS, readPrefs, writePrefs, type Prefs } from '@/lib/prefs';
import { setDeliveryNotifications } from '@/lib/offline-sync';
import { deriveAccent } from '@/lib/colour';
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss';

// Dock button + popover. Non-modal: the page behind stays usable, so no
// focus trap — Escape and clicking outside close it, focus returns to the
// dock button.
export default function PrefsPanel() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const swipe = useSwipeDismiss(() => setOpen(false));

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the browser-only store happens after mount by design (SSR has no localStorage)
    setPrefs(readPrefs());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  // Opened from the command palette
  useEffect(() => {
    const onRequest = () => setOpen(true);
    window.addEventListener('kotree:prefs-open', onRequest);
    return () => window.removeEventListener('kotree:prefs-open', onRequest);
  }, []);

  const patch = (p: Partial<Prefs>) => setPrefs(writePrefs(p));

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        aria-label="Preferences"
        aria-expanded={open}
        className={`h-9 w-9 p-0 m-0 shrink-0 rounded-full transition-all cursor-pointer flex items-center justify-center ${
          open ? 'bg-accent/40' : 'bg-transparent text-foreground hover:bg-secondary'
        }`}
      >
        <Settings2 className="w-5 h-5 text-accent-ink" />
      </button>

      {open && prefs && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Preferences"
          {...swipe}
          className="fixed right-4 top-[calc(5rem+env(safe-area-inset-top))] z-60 w-[19rem] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain rounded-xl border-[3px] border-foreground bg-card p-4 shadow-[5px_5px_0_0_var(--foreground)] animate-modal-content"
        >
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="w-4 h-4 text-accent-ink" aria-hidden="true" />
            <h2 className="font-display text-sm text-foreground">Preferences</h2>
          </div>

          {/* Accent */}
          <div className="mb-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Accent</div>
            <div className="flex flex-wrap gap-1.5">
              {ACCENTS.map(({ id, label, swatch }) => (
                <button
                  key={id}
                  onClick={() => patch({ accent: id, customAccent: null })}
                  aria-label={`${label} accent`}
                  aria-pressed={!prefs.customAccent && prefs.accent === id}
                  className={`kt-swatch w-8 h-8 rounded-full border-2 border-foreground flex items-center justify-center transition-transform cursor-pointer hover:scale-110 ${
                    !prefs.customAccent && prefs.accent === id ? 'shadow-[2px_2px_0_0_var(--foreground)] scale-105' : ''
                  }`}
                  style={{ backgroundColor: swatch }}
                >
                  {!prefs.customAccent && prefs.accent === id && <Check className="w-4 h-4 text-[#14110f]" aria-hidden="true" />}
                </button>
              ))}
            </div>
            {/* M84: free colour — inks are derived and AA-checked before they
                are stored; malformed input simply keeps the current preset. */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="color"
                aria-label="Custom accent colour"
                value={prefs.customAccent?.hex ?? '#ff7c47'}
                onChange={(event) => {
                  const derived = deriveAccent(event.target.value);
                  if (derived) patch({ customAccent: derived });
                }}
                className="h-8 w-10 cursor-pointer rounded border-2 border-foreground bg-card"
              />
              <span className="text-[11px] font-bold text-muted-foreground">
                {prefs.customAccent ? `Custom ${prefs.customAccent.hex}` : 'Custom colour'}
              </span>
              {prefs.customAccent && (
                <button
                  onClick={() => patch({ customAccent: null })}
                  className="rounded border-2 border-foreground bg-card px-2 py-1 text-[10px] font-black uppercase tracking-wide cursor-pointer hover:bg-secondary"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* P9: reading comfort — only note bodies change, not the whole UI */}
          <div className="mb-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Reading</div>
            <div className="flex items-center gap-1.5">
              <Type className="w-4 h-4 text-accent-ink" aria-hidden="true" />
              <button
                onClick={() => patch({ textScale: Math.max(0.9, Number((prefs.textScale - 0.1).toFixed(2))) })}
                aria-label="Decrease text size"
                className="min-h-9 min-w-9 rounded-lg border-2 border-foreground bg-card font-bold cursor-pointer hover:bg-secondary"
              >
                A−
              </button>
              <span className="min-w-10 text-center font-mono text-[10px] font-bold" aria-live="polite">
                {Math.round(prefs.textScale * 100)}%
              </span>
              <button
                onClick={() => patch({ textScale: Math.min(1.4, Number((prefs.textScale + 0.1).toFixed(2))) })}
                aria-label="Increase text size"
                className="min-h-9 min-w-9 rounded-lg border-2 border-foreground bg-card font-bold cursor-pointer hover:bg-secondary"
              >
                A+
              </button>
              <button
                onClick={() => patch({ readableFont: !prefs.readableFont })}
                aria-pressed={prefs.readableFont}
                className={`ml-auto min-h-9 rounded-lg border-2 border-foreground px-2 text-[10px] font-black uppercase tracking-wide cursor-pointer ${prefs.readableFont ? 'bg-accent text-accent-foreground' : 'bg-card hover:bg-secondary'}`}
              >
                Readable font
              </button>
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {[
                { value: 1.4, label: 'Tight' },
                { value: 1.7, label: 'Normal' },
                { value: 2, label: 'Loose' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => patch({ lineHeight: option.value })}
                  aria-pressed={prefs.lineHeight === option.value}
                  className={`min-h-9 rounded-lg border-2 border-foreground text-[10px] font-bold cursor-pointer ${prefs.lineHeight === option.value ? 'bg-accent text-accent-foreground' : 'bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-1.5">
            <Toggle
              label="Background effects"
              icon={Sparkles}
              checked={prefs.fx}
              onChange={(v) => patch({ fx: v })}
            />
            <Toggle
              label="Seasonal touches"
              icon={CalendarHeart}
              checked={prefs.seasons}
              onChange={(v) => patch({ seasons: v })}
            />
            <Toggle
              label="Sound effects"
              icon={prefs.sound ? Volume2 : VolumeX}
              checked={prefs.sound}
              onChange={(v) => patch({ sound: v })}
            />
            {/* M59: volume + per-kind switches, hidden while muted */}
            {prefs.sound && (
              <div className="rounded-lg border-2 border-foreground bg-card px-3 py-2">
                <label className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <span className="text-muted-foreground">Volume</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(prefs.volume * 100)}
                    onChange={(e) => patch({ volume: Number(e.target.value) / 100 })}
                    aria-label="Sound volume"
                    className="h-2 flex-1 accent-accent cursor-pointer"
                  />
                  <span className="w-8 text-right font-mono text-[10px]">{Math.round(prefs.volume * 100)}%</span>
                </label>
                <div className="mt-1.5 flex gap-1.5">
                  <KindToggle
                    label="Taps"
                    checked={prefs.soundTaps}
                    onChange={(v) => patch({ soundTaps: v })}
                  />
                  <KindToggle
                    label="Alerts"
                    checked={prefs.soundAlerts}
                    onChange={(v) => patch({ soundAlerts: v })}
                  />
                </div>
              </div>
            )}
            <Toggle
              label="Reduce motion"
              icon={Waves}
              checked={prefs.reduceMotion}
              onChange={(v) => patch({ reduceMotion: v })}
            />
            {/* G9: only where notifications can be asked for at all. The switch
                is mirrored into IndexedDB so the service worker obeys it. */}
            {typeof Notification !== 'undefined' && 'serviceWorker' in navigator && (
              <Toggle
                label="Delivery notifications"
                icon={Bell}
                checked={prefs.notify}
                onChange={(value) => {
                  if (!value) {
                    void setDeliveryNotifications(false);
                    return patch({ notify: false });
                  }
                  void Notification.requestPermission()
                    .then((permission) => {
                      const granted = permission === 'granted';
                      void setDeliveryNotifications(granted);
                      patch({ notify: granted });
                    })
                    .catch(() => patch({ notify: false }));
                }}
              />
            )}
          </div>

          <p className="mt-3 text-[10px] text-muted-foreground font-medium">
            Saved on this device. Press <kbd className="rounded border border-foreground bg-secondary px-1 font-mono">?</kbd> for shortcuts.
          </p>
        </div>
      )}
    </>
  );
}

function Toggle({
  label,
  icon: Icon,
  checked,
  onChange,
}: {
  label: string;
  icon: typeof Sun;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-2 rounded-lg border-2 border-foreground bg-card px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-colors cursor-pointer"
    >
      <span className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-accent-ink" aria-hidden="true" />
        {label}
      </span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-foreground transition-colors ${
          checked ? 'bg-accent' : 'bg-muted'
        }`}
      >
        <span
          className={`absolute h-3 w-3 rounded-full bg-foreground transition-all ${checked ? 'left-4.5' : 'left-0.5'}`}
        />
      </span>
    </button>
  );
}

// M59: the compact twin of Toggle for the two sound kinds
function KindToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex-1 rounded-md border-2 border-foreground px-2 py-1 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
        checked ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
      }`}
    >
      {label}
    </button>
  );
}
