'use client';

import { useRef, useState } from 'react';
import { Pause, Play, Square } from 'lucide-react';

// P13: a tiny Win95-era media player that synthesises its own chiptune with
// Web Audio. No asset pipeline, no audio files, and the context is only
// created after a click, so autoplay policy and save-data stay happy.
const TRACKS = [
  { id: 'boot', name: 'Boot Sequence', notes: [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25] },
  { id: 'modem', name: 'Modem Lullaby', notes: [392, 523.25, 440, 587.33, 392, 329.63] },
];

const win95Button =
  'inline-flex items-center justify-center gap-1 border-2 border-t-white border-l-white border-b-black border-r-black bg-[#c0c0c0] px-2 py-1 text-xs font-bold text-black active:border-t-black active:border-l-black active:border-b-white active:border-r-white';

export default function MediaPlayer() {
  const [track, setTrack] = useState(TRACKS[0]);
  const [playing, setPlaying] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const stop = () => {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
  };

  const play = () => {
    stop();
    const audio = contextRef.current ?? new AudioContext();
    contextRef.current = audio;
    void audio.resume();
    const start = audio.currentTime + 0.05;
    const gain = audio.createGain();
    gain.gain.value = 0.08;
    gain.connect(audio.destination);
    const oscillators: OscillatorNode[] = [];
    track.notes.forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      oscillator.type = 'square';
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(start + index * 0.22);
      oscillator.stop(start + index * 0.22 + 0.18);
      oscillators.push(oscillator);
    });
    setPlaying(true);
    const timer = window.setTimeout(stop, track.notes.length * 220 + 100);
    stopRef.current = () => {
      window.clearTimeout(timer);
      oscillators.forEach((oscillator) => {
        try {
          oscillator.stop();
        } catch {
          // already ended
        }
      });
    };
  };

  return (
    <div className="flex h-full flex-col gap-3 bg-[#c0c0c0] p-3 text-black">
      <div className="border-2 border-t-black border-l-black border-b-white border-r-white bg-black p-3">
        <div className="flex h-10 items-end gap-1" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => (
            <span
              key={index}
              className="flex-1 border border-[#00ff66] bg-[#003b1a]"
              style={{ height: `${20 + ((index * 37 + track.id.length * 11) % 80)}%` }}
            />
          ))}
        </div>
        <p className="mt-2 truncate font-mono text-[10px] text-[#00ff66]">
          {playing ? '▶ playing' : '■ stopped'} — {track.name}
        </p>
      </div>

      <label className="text-xs font-bold">
        Track
        <select
          value={track.id}
          onChange={(event) => setTrack(TRACKS.find((item) => item.id === event.target.value) ?? TRACKS[0])}
          className="mt-1 w-full border-2 border-t-black border-l-black border-b-white border-r-white bg-white px-1 py-0.5 text-xs"
        >
          {TRACKS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-2">
        <button type="button" onClick={play} className={win95Button} aria-label={playing ? 'Restart track' : 'Play track'}>
          <Play className="h-3.5 w-3.5" /> Play
        </button>
        <button type="button" onClick={stop} className={win95Button} disabled={!playing}>
          <Square className="h-3.5 w-3.5" /> Stop
        </button>
        <button type="button" onClick={stop} className={win95Button} aria-label="Pause" disabled={!playing}>
          <Pause className="h-3.5 w-3.5" /> Pause
        </button>
      </div>

      <p className="mt-auto text-[10px] text-gray-800">
        Synthesised locally. No audio file is downloaded, and no request leaves this window.
      </p>
    </div>
  );
}
