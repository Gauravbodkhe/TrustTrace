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
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  const isListeningRef = useRef(false);

  // Keep callback reference updated without triggering effect re-runs
  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  const isSupported =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(() => {
    setError(null);

    if (!isSupported) {
      setError(
        'Voice speech recognition is not supported by your current browser. For microphone voice input, please use Google Chrome or Microsoft Edge. You can also type commands directly into the assistant.'
      );
      return;
    }

    // Abort and discard any existing instance so we start fresh
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    try {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionClass();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        setError(null);
      };

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
          const trimmed = currentFinal.trim();
          setTranscript((prev) => {
            const updated = prev ? `${prev} ${trimmed}` : trimmed;
            if (onFinalTranscriptRef.current) {
              onFinalTranscriptRef.current(updated);
            }
            return updated;
          });
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition event error:', event.error);
        if (event.error === 'no-speech') {
          // Normal silence, keep recognition running
          return;
        }
        if (event.error === 'aborted') {
          // Intentional stop or abort
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError(
            'Microphone access was denied. Please allow microphone permissions in your browser URL bar (click the lock or camera/mic icon).'
          );
        } else if (event.error === 'network') {
          setError('Speech recognition network service error. You can still type commands directly below.');
        } else {
          setError(`Speech recognition note: ${event.error}`);
        }
        isListeningRef.current = false;
        setIsListening(false);
      };

      recognition.onend = () => {
        // Speech recognition ended
        isListeningRef.current = false;
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      console.error('Failed to start SpeechRecognition:', err);
      setError(err?.message || 'Could not start microphone. Please check browser permissions.');
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [isSupported]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
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
