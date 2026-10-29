import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseVoiceRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export const useVoiceRecognition = (onFinalTranscript?: (text: string) => void): UseVoiceRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isSupported = typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let currentFinal = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          currentFinal += item[0].transcript;
        } else {
          currentInterim += item[0].transcript;
        }
      }

      if (currentFinal) {
        setTranscript((prev) => {
          const updated = prev ? `${prev} ${currentFinal.trim()}` : currentFinal.trim();
          if (onFinalTranscript) onFinalTranscript(updated);
          return updated;
        });
      }
      setInterimTranscript(currentInterim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        // Silence is expected occasionally; don't alarm user
        return;
      }
      if (event.error === 'not-allowed') {
        setError('Microphone access was denied. Please allow microphone permissions in your browser.');
      } else {
        setError(`Speech recognition notice: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [isSupported, onFinalTranscript]);

  const startListening = useCallback(() => {
    setError(null);
    if (!isSupported) {
      setError('Voice recognition is not supported in this browser. Please use Chrome, Edge, or a Web Speech-compatible browser.');
      return;
    }
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err: any) {
        setError(err?.message || 'Could not start microphone');
      }
    }
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
};
