import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseSpeechSynthesisReturn {
  isSupported: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

export const useSpeechSynthesis = (): UseSpeechSynthesisReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (isSupported) {
      synthRef.current = window.speechSynthesis;
    }
  }, [isSupported]);

  const stripSensitiveText = (raw: string): string => {
    // Strip raw bearer tokens, hex hashes, or secret patterns before speaking aloud
    return raw
      .replace(/Bearer\s+[A-Za-z0-9_\-\.]{10,}/gi, 'token redacted')
      .replace(/sk-[A-Za-z0-9_\-]{20,}/g, 'API key redacted')
      .replace(/AIzaSy[A-Za-z0-9_\-]{33}/g, 'Google key redacted')
      .replace(/[a-f0-9]{32,64}/gi, 'identifier');
  };

  const speak = useCallback((text: string) => {
    if (!isSupported || !synthRef.current) return;

    synthRef.current.cancel();

    const sanitized = stripSensitiveText(text);
    const utterance = new SpeechSynthesisUtterance(sanitized);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    synthRef.current.speak(utterance);
  }, [isSupported]);

  const pause = useCallback(() => {
    if (synthRef.current && isPlaying && !isPaused) {
      synthRef.current.pause();
      setIsPaused(true);
    }
  }, [isPlaying, isPaused]);

  const resume = useCallback(() => {
    if (synthRef.current && isPlaying && isPaused) {
      synthRef.current.resume();
      setIsPaused(false);
    }
  }, [isPlaying, isPaused]);

  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, []);

  return {
    isSupported,
    isPlaying,
    isPaused,
    speak,
    pause,
    resume,
    stop,
  };
};
