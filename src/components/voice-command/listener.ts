import { getSpeechRecognitionCtor } from './speech';
import type { SpeechRecognitionErrorEventLike, SpeechRecognitionEventLike } from './speech';

export interface RecognitionCallbacks {
  onStart: () => void;
  onResult: (transcript: string) => void;
  onError: (error: SpeechRecognitionErrorEventLike) => void;
  onEnd: () => void;
}

// Wires up and starts a speech recognition session; returns whether it started
export function startListening(callbacks: RecognitionCallbacks): boolean {
  const SpeechRecognitionCtor = getSpeechRecognitionCtor();
  if (!SpeechRecognitionCtor) return false;

  const recognition = new SpeechRecognitionCtor();
  recognition.lang = 'id-ID';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = callbacks.onStart;
  recognition.onresult = (event: SpeechRecognitionEventLike) => {
    const transcript = event.results[0][0].transcript;
    callbacks.onResult(transcript);
  };
  recognition.onerror = callbacks.onError;
  recognition.onend = callbacks.onEnd;

  recognition.start();
  return true;
}
