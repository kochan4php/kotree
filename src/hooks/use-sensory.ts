'use client';

import { useCallback } from 'react';
import { hapticPattern, readPrefs, soundAllowed, type SoundKind } from '@/lib/prefs';

// Singleton AudioContext to prevent main thread freezing/flickering
let globalAudioCtx: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  // Resume if suspended (browser policy)
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
}

// M59: master volume from the preferences, applied to every blip.
function masterVolume(): number {
  const volume = readPrefs().volume;
  return typeof volume === 'number' && Number.isFinite(volume) ? volume : 0.7;
}

function playTone(
  type: OscillatorType,
  from: number,
  to: number | null,
  duration: number,
  gain: number,
  delay = 0,
): void {
  const audioCtx = getAudioContext();
  if (!audioCtx) return;
  try {
    const volume = masterVolume();
    if (volume <= 0) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const t0 = audioCtx.currentTime + delay;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, t0);
    if (to !== null) oscillator.frequency.exponentialRampToValueAtTime(to, t0 + duration);

    gainNode.gain.setValueAtTime(gain * volume, t0);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start(t0);
    oscillator.stop(t0 + duration);
  } catch {
    // Ignore audio errors
  }
}

// M59: one gate per action kind, plus the hidden-tab rule
function soundEnabled(kind: SoundKind): boolean {
  return soundAllowed(kind);
}

export function useSensory() {
  // M70: kind decides the pattern — a tap is one short pulse, a success is a
  // little double-tap. Both are pref-gated through hapticPattern().
  const triggerHaptic = useCallback((kind: SoundKind = 'tap') => {
    if (typeof document !== 'undefined' && document.hidden) return; // hidden tab: no haptics either
    const pattern = hapticPattern(kind);
    if (pattern === null) return;
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(pattern);
      } catch {
        // Ignore errors on unsupported devices
      }
    }
  }, []);

  const triggerSound = useCallback(() => {
    if (!soundEnabled('tap')) return;
    // Quick descending blip
    playTone('sine', 800, 300, 0.1, 0.3);
  }, []);

  const playFeedback = useCallback(() => {
    triggerHaptic();
    triggerSound();
  }, [triggerHaptic, triggerSound]);

  const playHoverFeedback = useCallback(() => {
    if (!soundEnabled('tap')) return;
    // A very subtle high pitch "tick"
    playTone('sine', 1200, null, 0.05, 0.05);
  }, []);

  const playSuccess = useCallback(() => {
    triggerHaptic('alert'); // M70: successes buzz where the platform allows it
    if (!soundEnabled('alert')) return;
    // Two rising notes
    playTone('triangle', 659, null, 0.12, 0.12, 0);
    playTone('triangle', 988, null, 0.14, 0.12, 0.09);
  }, [triggerHaptic]);

  const playError = useCallback(() => {
    triggerHaptic('alert');
    if (!soundEnabled('alert')) return;
    // Low descending buzz
    playTone('sawtooth', 220, 130, 0.18, 0.12);
  }, [triggerHaptic]);

  return { playFeedback, playHoverFeedback, triggerHaptic, triggerSound, playSuccess, playError };
}
