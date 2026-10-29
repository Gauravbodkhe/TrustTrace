import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  X,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Check,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useVoiceRecognition } from './useVoiceRecognition';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import { parseVoiceCommand, ParsedVoiceCommand } from './commandParser';
import { api } from '../services/api';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPolicy?: (policyId: string) => void;
  onSelectScenario?: (scenarioId: string) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onSelectPolicy,
  onSelectScenario,
}) => {
  const navigate = useNavigate();
  const [editableText, setEditableText] = useState('');
  const [parsedCommand, setParsedCommand] = useState<ParsedVoiceCommand | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [speakingText, setSpeakingText] = useState<string | null>(null);

  const {
    isSupported: isSpeechSupported,
    isListening,
    transcript,
    interimTranscript,
    error: micError,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition((finalText) => {
    setEditableText(finalText);
    const cmd = parseVoiceCommand(finalText);
    setParsedCommand(cmd);
  });

  const {
    isSupported: isTtsSupported,
    isPlaying: isTtsPlaying,
    isPaused: isTtsPaused,
    speak,
    pause,
    resume,
    stop,
  } = useSpeechSynthesis();

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setEditableText('');
      setParsedCommand(null);
      setActionNotice(null);
      setSpeakingText(null);
      resetTranscript();
      if (isSpeechSupported) {
        startListening();
      }
    } else {
      stopListening();
      stop();
    }
  }, [isOpen]);

  // Update command parse if user manually edits text
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEditableText(val);
    setParsedCommand(parseVoiceCommand(val));
  };

  const handleExecuteCommand = async () => {
    if (!parsedCommand) return;
    setActionNotice(null);

    switch (parsedCommand.intent) {
      case 'NAVIGATE_DASHBOARD':
        navigate('/');
        onClose();
        break;
      case 'NAVIGATE_NEW_EXPERIMENT':
        navigate('/experiments/new');
        onClose();
        break;
      case 'NAVIGATE_EXPERIMENTS':
        navigate('/experiments');
        onClose();
        break;
      case 'NAVIGATE_COMPARISON':
        navigate('/comparison');
        onClose();
        break;
      case 'NAVIGATE_TRACES':
        navigate('/traces');
        onClose();
        break;
      case 'NAVIGATE_EVIDENCE':
      case 'EXPLAIN_FAILURE':
        navigate('/evidence');
        onClose();
        break;
      case 'NAVIGATE_REPORTS':
      case 'GENERATE_REPORT':
        navigate('/reports');
        onClose();
        break;
      case 'NAVIGATE_SETTINGS':
        navigate('/settings');
        onClose();
        break;
      case 'SELECT_POLICY':
        if (parsedCommand.parameter) {
          if (onSelectPolicy) {
            onSelectPolicy(parsedCommand.parameter);
            setActionNotice(`Selected strategy: ${parsedCommand.parameter}`);
          } else {
            navigate(`/experiments/new?policy=${parsedCommand.parameter}`);
            onClose();
          }
        }
        break;
      case 'SELECT_SCENARIO':
        if (parsedCommand.parameter) {
          if (onSelectScenario) {
            onSelectScenario(parsedCommand.parameter);
            setActionNotice(`Selected scenario: ${parsedCommand.parameter}`);
          } else {
            navigate(`/experiments/new?scenario=${parsedCommand.parameter}`);
            onClose();
          }
        }
        break;
      case 'SHOW_LATEST_EXPERIMENT':
        try {
          const list = await api.experiments.list(1, 0);
          if (list && list.length > 0) {
            navigate(`/experiments/${list[0].id}`);
            onClose();
          } else {
            setActionNotice('No experiments found. Create one first!');
          }
        } catch {
          navigate('/experiments');
          onClose();
        }
        break;
      case 'SUMMARIZE_RESULTS':
        try {
          const stats = await api.metrics.dashboard();
          const summaryMsg = `TrustTrace has recorded ${stats.total_runs} runs across ${stats.total_experiments} experiments. The overall task success rate is ${stats.task_success_rate !== null ? (stats.task_success_rate * 100).toFixed(0) : '0'} percent. Recovery Policy G demonstrates robust dynamic recovery under budget constraints.`;
          setSpeakingText(summaryMsg);
          speak(summaryMsg);
        } catch {
          setActionNotice('Could not load summary telemetry.');
        }
        break;
      default:
        setActionNotice('Could not map speech to a recognized action.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-[#0f1728] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                TrustTrace Voice Assistant
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Speak commands or dictate notes naturally
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Listening Indicator / Wave animation */}
          <div className="flex flex-col items-center justify-center py-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative">
              {isListening && (
                <div className="absolute inset-0 rounded-full bg-indigo-400/30 dark:bg-indigo-500/20 animate-ping" />
              )}
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-all ${
                  isListening
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {isListening ? <Mic className="h-6 w-6 animate-pulse" /> : <MicOff className="h-6 w-6" />}
              </button>
            </div>

            <span className="mt-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isListening ? 'Listening for command...' : 'Microphone idle. Click button to speak.'}
            </span>

            {interimTranscript && (
              <span className="mt-1 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 italic max-w-xs text-center truncate">
                "{interimTranscript}..."
              </span>
            )}
          </div>

          {micError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-500" />
              <span>{micError}</span>
            </div>
          )}

          {/* Editable Transcript Field */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Recognized Speech (You can edit before executing):
            </label>
            <div className="relative">
              <input
                type="text"
                value={editableText}
                onChange={handleTextChange}
                placeholder='e.g., "Create a new experiment", "Compare all recovery policies", "Generate overall PDF"'
                className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Parsed Command Action Card */}
          {parsedCommand && parsedCommand.intent !== 'UNKNOWN' && (
            <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase font-bold text-indigo-700 dark:text-indigo-400">
                  Detected Intent: {parsedCommand.intent}
                </span>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {parsedCommand.description}
                </p>
              </div>

              <button
                type="button"
                onClick={handleExecuteCommand}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors shadow-2xs"
              >
                <span>Execute</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}

          {actionNotice && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center space-x-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span>{actionNotice}</span>
            </div>
          )}

          {/* Spoken Output Controls (TTS) */}
          {speakingText && (
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <Volume2 className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Voice Summary Playback</span>
                </span>

                <div className="flex items-center space-x-1.5">
                  {isTtsPlaying && !isTtsPaused ? (
                    <button
                      onClick={pause}
                      className="p-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-xs"
                      title="Pause"
                    >
                      <Pause className="h-3 w-3" />
                    </button>
                  ) : (
                    <button
                      onClick={isTtsPaused ? resume : () => speak(speakingText)}
                      className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 text-xs"
                      title="Play"
                    >
                      <Play className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    onClick={stop}
                    className="p-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-xs"
                    title="Stop"
                  >
                    <Square className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 italic leading-relaxed">
                "{speakingText}"
              </p>
            </div>
          )}

          {/* Sample Voice Commands Helper */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Try saying:</span>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div>• "Create a new experiment"</div>
              <div>• "Compare all recovery policies"</div>
              <div>• "Explain why this run failed"</div>
              <div>• "Generate the overall PDF report"</div>
              <div>• "Summarize the experimental results"</div>
              <div>• "Choose the timeout fault scenario"</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
