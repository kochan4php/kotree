'use client';

import { useEffect, useState } from 'react';

const NOTE_KEY = 'kotree-win95-note';

// M48: Notepad.exe — the draft lives in localStorage, so it survives a reboot
// of the whole fake operating system.
export default function Notepad() {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only store, applied after mount by design
      setText(localStorage.getItem(NOTE_KEY) ?? '');
    } catch {
      // private mode — the draft just starts empty
    }
  }, []);

  const onChange = (value: string) => {
    setText(value);
    try {
      localStorage.setItem(NOTE_KEY, value);
      setSaved(true);
    } catch {
      setSaved(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white text-black">
      <div className="flex gap-3 border-b-2 border-[#808080] bg-[#c0c0c0] px-2 py-0.5 text-xs">
        <span className="underline decoration-dotted">File</span>
        <span className="underline decoration-dotted">Edit</span>
        <span className="underline decoration-dotted">Help</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Notepad draft"
        placeholder="Type a draft — it is saved in this browser."
        spellCheck={false}
        className="min-h-40 flex-1 resize-none p-2 font-mono text-sm text-black outline-none placeholder:text-gray-400"
      />
      <div className="flex items-center justify-between border-t-2 border-[#808080] bg-[#c0c0c0] px-2 py-0.5 font-mono text-[10px] text-black">
        <span>{text.length} chars</span>
        <span>{saved ? 'Saved locally' : 'Storage blocked'}</span>
      </div>
    </div>
  );
}
