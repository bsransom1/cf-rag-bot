/**
 * Browser Web Speech API — zero dependencies, no server audio.
 * Chrome / Edge: full support. Safari: partial. Firefox: limited.
 */

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getConstructor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

export function isSpeechRecognitionSupported(): boolean {
  return Boolean(getConstructor());
}

export function createSpeechRecognition(): SpeechRecognition | null {
  const Ctor = getConstructor();
  if (!Ctor) return null;
  return new Ctor();
}
