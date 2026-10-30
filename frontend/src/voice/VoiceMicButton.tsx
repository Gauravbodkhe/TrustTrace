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
  const { isSupported, isListening, startListening, stopListening, error } = useVoiceRecognition(onTranscript);

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
        title="Voice speech recognition not supported in this browser (use Chrome or Edge)"
        className={`p-1.5 rounded-md text-slate-300 dark:text-slate-600 cursor-not-allowed ${className}`}
      >
        <MicOff className="h-3.5 w-3.5" />
      </button>
    );
  }

  const sizeClasses =
    size === 'sm'
      ? 'p-1 text-xs'
      : size === 'lg'
      ? 'p-2 text-sm'
      : 'p-1.5 text-xs';

  const iconSizes =
    size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleClick}
        title={error || (isListening ? 'Listening... click to stop' : title)}
        aria-label={isListening ? 'Stop voice recording' : 'Start voice recording'}
        className={`rounded-lg border transition-all flex items-center justify-center ${sizeClasses} ${
          isListening
            ? 'bg-rose-50 border-rose-400 text-rose-600 dark:bg-rose-950/60 dark:border-rose-700 dark:text-rose-300 animate-pulse ring-2 ring-rose-400/30'
            : error
            ? 'bg-amber-50 border-amber-300 text-amber-600 dark:bg-amber-950/40 dark:border-amber-700'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 shadow-2xs'
        } ${className}`}
      >
        {isListening ? (
          <Mic className={`${iconSizes} text-rose-600 animate-bounce`} />
        ) : (
          <Mic className={iconSizes} />
        )}
      </button>

      {/* Pulsing indicator when active */}
      {isListening && (
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
        </span>
      )}
    </div>
  );
};
