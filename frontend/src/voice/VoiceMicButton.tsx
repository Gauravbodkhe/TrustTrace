import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useVoiceRecognition } from './useVoiceRecognition';

interface VoiceMicButtonProps {
  onTranscript: (text: string) => void;
  title?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const VoiceMicButton: React.FC<VoiceMicButtonProps> = ({
  onTranscript,
  title = 'Click to speak (Voice Typing)',
  className = '',
  size = 'md',
}) => {
  const { isSupported, isListening, startListening, stopListening, error } = useVoiceRecognition(
    (capturedText) => {
      onTranscript(capturedText);
    }
  );

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        title="Voice typing not supported in this browser"
        className={`p-1.5 rounded-md text-slate-300 dark:text-slate-600 cursor-not-allowed ${className}`}
      >
        <MicOff className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleClick}
        title={isListening ? 'Listening... click to stop' : title}
        className={`p-1.5 rounded-md transition-all ${
          isListening
            ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-300 dark:border-rose-800 animate-pulse'
            : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        } ${className}`}
      >
        <Mic className={`h-3.5 w-3.5 ${isListening ? 'animate-bounce' : ''}`} />
      </button>
      {error && (
        <span
          className="absolute bottom-full mb-1 right-0 w-48 p-1.5 bg-rose-900 text-rose-100 text-[10px] rounded shadow-lg z-50 pointer-events-none"
        >
          {error}
        </span>
      )}
    </div>
  );
};
