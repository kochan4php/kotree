'use client';

import { useCallback } from 'react';
import { readPrefs } from '@/lib/prefs';

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

function soundEnabled(): boolean {
  return readPrefs().sound;
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
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const t0 = audioCtx.currentTime + delay;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, t0);
    if (to !== null) oscillator.frequency.exponentialRampToValueAtTime(to, t0 + duration);

    gainNode.gain.setValueAtTime(gain, t0);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start(t0);
    oscillator.stop(t0 + duration);
  } catch {
    // Ignore audio errors
  }
}

export function useSensory() {
  const triggerHaptic = useCallback(() => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        // A subtle 15ms vibration
        window.navigator.vibrate(15);
      } catch {
        // Ignore errors on unsupported devices
      }
    }
  }, []);

  const triggerSound = useCallback(() => {
    if (!soundEnabled()) return;
    // Quick descending blip
    playTone('sine', 800, 300, 0.1, 0.3);
  }, []);

  const playFeedback = useCallback(() => {
    triggerHaptic();
    triggerSound();
  }, [triggerHaptic, triggerSound]);

  const playHoverFeedback = useCallback(() => {
    if (!soundEnabled()) return;
    // A very subtle high pitch "tick"
    playTone('sine', 1200, null, 0.05, 0.05);
  }, []);

  const playSuccess = useCallback(() => {
    if (!soundEnabled()) return;
    // Two rising notes
    playTone('triangle', 659, null, 0.12, 0.12, 0);
    playTone('triangle', 988, null, 0.14, 0.12, 0.09);
  }, []);

  const playError = useCallback(() => {
    if (!soundEnabled()) return;
    // Low descending buzz
    playTone('sawtooth', 220, 130, 0.18, 0.12);
  }, []);

  return { playFeedback, playHoverFeedback, triggerHaptic, triggerSound, playSuccess, playError };
}
