'use client';

import { Terminal as TerminalIcon, X } from 'lucide-react';
import { useTerminal } from './use-terminal';
import TerminalWindow from './window';

export default function AITerminal() {
  const { isOpen, isRendered, history, input, bottomRef, setInput, openTerminal, closeTerminal, handleSubmit } =
    useTerminal();

  return (
    <>
      {/* Dock Icon Button */}
      <button
        onClick={isOpen ? closeTerminal : openTerminal}
        className={`w-11 h-11 p-0 m-0 shrink-0 rounded-full transition-all cursor-pointer flex items-center justify-center ${
          isOpen ? 'bg-accent/20 shadow-inner shadow-black/20' : 'bg-transparent text-foreground hover:bg-accent/20'
        }`}
        aria-label="Open AI Terminal"
      >
        {isOpen ? <X className="w-5 h-5 text-red-500" /> : <TerminalIcon className="w-5 h-5 text-green-500" />}
      </button>

      {/* Terminal Window */}
      {isRendered && (
        <TerminalWindow
          isOpen={isOpen}
          history={history}
          input={input}
          bottomRef={bottomRef}
          onInput={setInput}
          onSubmit={handleSubmit}
          onClose={closeTerminal}
        />
      )}
    </>
  );
}
