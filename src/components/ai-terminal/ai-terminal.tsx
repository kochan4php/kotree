'use client';

import { Terminal as TerminalIcon, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTerminal } from './use-terminal';

// The terminal window (and its dialog code) only loads the first time the
// dock button or the ` shortcut opens it.
const TerminalWindow = dynamic(() => import('./window'));

export default function AITerminal() {
  const { isOpen, isRendered, history, input, bottomRef, setInput, openTerminal, closeTerminal, handleSubmit, handleInputKeyDown } =
    useTerminal();

  return (
    <>
      {/* Dock Icon Button */}
      <button
        onClick={isOpen ? closeTerminal : openTerminal}
        className={`h-9 w-9 p-0 m-0 shrink-0 rounded-full transition-all cursor-pointer flex items-center justify-center ${
          isOpen ? 'bg-accent/40' : 'bg-transparent text-foreground hover:bg-secondary'
        }`}
        aria-label={isOpen ? 'Close AI Terminal' : 'Open AI Terminal'}
      >
        {isOpen ? <X className="w-5 h-5 text-red-600" /> : <TerminalIcon className="w-5 h-5 text-green-700" />}
      </button>

      {/* Terminal Window */}
      {isRendered && (
        <TerminalWindow
          isOpen={isOpen}
          history={history}
          input={input}
          bottomRef={bottomRef}
          onInput={setInput}
          onInputKeyDown={handleInputKeyDown}
          onSubmit={handleSubmit}
          onClose={closeTerminal}
        />
      )}
    </>
  );
}
