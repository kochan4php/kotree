'use client';

import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import { getSpeechRecognitionCtor } from './speech';
import { startListening } from './listener';
import { processCommand } from './commands';
import { useTelepathy } from './use-telepathy';
import TelepathyModal from './telepathy-modal';

export default function VoiceCommand() {
  const [isListening, setIsListening] = useState(false);
  const { isTelepathy, isTelepathyRendered, telepathyInput, setTelepathyInput, openTelepathy, closeTelepathy } =
    useTelepathy();

  const handleTelepathyFallback = () => {
    setIsListening(false);
    openTelepathy();
  };

  const submitTelepathy = (e: React.FormEvent) => {
    e.preventDefault();
    if (telepathyInput.trim()) {
      processCommand(telepathyInput);
    }
    closeTelepathy();
    setTelepathyInput('');
  };

  const handleListen = async () => {
    if (typeof window === 'undefined' || !getSpeechRecognitionCtor()) {
      handleTelepathyFallback();
      return;
    }
    if (isListening) return;

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      toast.error(`Microphone permission failed: ${(err as Error).message}`);
      handleTelepathyFallback();
      return;
    }

    const started = startListening({
      onStart: () => {
        setIsListening(true);
        toast.info("Listening... Say a link name (e.g. 'GitHub')");
      },
      onResult: processCommand,
      onError: (event) => {
        setIsListening(false);
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed' || event.error === 'network') {
          toast.error('Browser blocked the voice API.');
          handleTelepathyFallback();
        } else if (event.error === 'no-speech') {
          toast.error('No speech detected. Try again.');
        } else {
          toast.error(`Voice error: ${event.error}`);
          handleTelepathyFallback();
        }
      },
      onEnd: () => setIsListening(false),
    });

    if (!started) handleTelepathyFallback();
  };

  return (
    <>
      <button
        onClick={handleListen}
        disabled={isListening}
        className={`w-11 h-11 p-0 m-0 shrink-0 rounded-full transition-all cursor-pointer flex items-center justify-center ${
          isListening
            ? 'bg-red-500 animate-pulse text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
            : 'bg-transparent text-foreground hover:bg-accent/20'
        }`}
        aria-label="Voice Command"
      >
        {isListening ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-rose-500" />}
      </button>

      {isTelepathyRendered && (
        <TelepathyModal
          isOpen={isTelepathy}
          value={telepathyInput}
          onInput={setTelepathyInput}
          onSubmit={submitTelepathy}
          onClose={closeTelepathy}
        />
      )}
    </>
  );
}
