import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  X,
  Volume2,
  Play,
  Pause,
  Square,
  Check,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Send,
  Info,
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
  const [isExecuting, setIsExecuting] = useState(false);

  const handleSpeechResult = useCallback((finalText: string) => {
    setEditableText(finalText);
    const cmd = parseVoiceCommand(finalText);
    setParsedCommand(cmd);
  }, []);

  const {
    isSupported: isSpeechSupported,
    isListening,
    interimTranscript,
    error: micError,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition(handleSpeechResult);

  const {
    isSupported: _isTtsSupported,
    isPlaying: isTtsPlaying,
    isPaused: isTtsPaused,
    speak,
    pause,
    resume,
    stop,
  } = useSpeechSynthesis();

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setEditableText('');
      setParsedCommand(null);
      setActionNotice(null);
      setSpeakingText(null);
      resetTranscript();
    } else {
      stopListening();
      stop();
    }
  }, [isOpen, resetTranscript, stopListening, stop]);

  // Update command parse if user manually edits text
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEditableText(val);
    setParsedCommand(parseVoiceCommand(val));
  };

  const handleApplyPreset = (commandText: string) => {
    setEditableText(commandText);
    const cmd = parseVoiceCommand(commandText);
    setParsedCommand(cmd);
  };

  const handleExecuteCommand = async () => {
    if (!parsedCommand || parsedCommand.intent === 'UNKNOWN') return;
    setActionNotice(null);
    setIsExecuting(true);

    try {
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

        case 'RUN_BENCHMARK': {
          setActionNotice('Executing automated benchmark evaluation...');
          const exp = await api.experiments.create({
            name: 'Voice Benchmark: Fault Recovery Evaluation',
            description: 'Triggered via voice command assistant.',
            agent_type: 'mock',
            policy_id: 'policy_g_budget_aware',
            scenario_id: 'transient_error_step1',
            task_ids: ['task_expense_policy', 'task_order_lookup'],
            repetitions: 1,
            seed: 42,
            max_retries: 3,
            timeout_seconds: 30,
            token_budget: 2000,
            cost_budget_usd: null,
          });
          await api.experiments.run(exp.id);
          setActionNotice('Benchmark completed! Opening results...');
          navigate(`/experiments/${exp.id}`);
          onClose();
          break;
        }

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
            const summaryMsg = `TrustTrace has recorded ${stats.total_runs} runs across ${stats.total_experiments} experiments. The overall task success rate is ${
              stats.task_success_rate !== null ? (stats.task_success_rate * 100).toFixed(0) : '0'
            } percent. Recovery Policy G demonstrates robust dynamic recovery under budget constraints.`;
            setSpeakingText(summaryMsg);
            speak(summaryMsg);
          } catch {
            setActionNotice('Could not load summary telemetry.');
          }
          break;

        default:
          setActionNotice('Could not map speech to a recognized action.');
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const sampleCommands = [
    { label: 'Compare all recovery policies', text: 'Compare all recovery policies' },
    { label: 'Create a new experiment', text: 'Create a new experiment' },
    { label: 'Quick benchmark evaluation', text: 'Run quick benchmark' },
    { label: 'Explain why this run failed', text: 'Explain why this run failed' },
    { label: 'Generate the overall PDF report', text: 'Generate the overall PDF report' },
    { label: 'Summarize experimental results', text: 'Summarize the experimental results' },
    { label: 'View Trace Explorer', text: 'Show traces' },
    { label: 'Open Settings', text: 'Open settings' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-[#0f1728] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
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
                Speak voice commands or click quick actions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close Assistant"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Listening Indicator / Large Mic Button */}
          <div className="flex flex-col items-center justify-center py-5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative">
              {isListening && (
                <div className="absolute inset-0 rounded-full bg-indigo-400/30 dark:bg-indigo-500/20 animate-ping" />
              )}
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all transform active:scale-95 ${
                  isListening
                    ? 'bg-rose-600 text-white ring-4 ring-rose-200 dark:ring-rose-950/60'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                }`}
                title={isListening ? 'Click to stop listening' : 'Click to start speaking'}
              >
                {isListening ? <Mic className="h-7 w-7 animate-pulse" /> : <Mic className="h-7 w-7" />}
              </button>
            </div>

            <span className="mt-3.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              {isListening
                ? 'Listening... Speak your command clearly'
                : 'Microphone Idle. Click the microphone to speak'}
            </span>

            {interimTranscript && (
              <span className="mt-1 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 italic max-w-xs text-center truncate">
                "{interimTranscript}..."
              </span>
            )}
          </div>

          {/* Browser / Mic notices */}
          {micError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-500 mt-0.5" />
              <div>
                <p className="font-semibold">Microphone Notice</p>
                <p className="mt-0.5 leading-relaxed">{micError}</p>
              </div>
            </div>
          )}

          {!isSpeechSupported && !micError && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs flex items-start space-x-2">
              <Info className="h-4 w-4 flex-shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold">Browser Voice Input Note</p>
                <p className="mt-0.5 leading-relaxed">
                  Web Speech recognition works best in Chrome and Edge. You can also click any preset action or type your command below.
                </p>
              </div>
            </div>
          )}

          {/* Command Input & Execution */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Voice Command / Text Input:
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={editableText}
                onChange={handleTextChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleExecuteCommand();
                  }
                }}
                placeholder='e.g. "Compare all recovery policies", "New experiment", "Quick benchmark"'
                className="flex-1 px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-sans"
              />
              <button
                type="button"
                onClick={handleExecuteCommand}
                disabled={isExecuting || !parsedCommand || parsedCommand.intent === 'UNKNOWN'}
                className="px-3.5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
                title="Execute Command"
              >
                <span>{isExecuting ? 'Running...' : 'Execute'}</span>
                <Send className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Parsed Command Action Card */}
          {parsedCommand && parsedCommand.intent !== 'UNKNOWN' && (
            <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 flex items-center justify-between text-xs animate-in fade-in duration-200">
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
                disabled={isExecuting}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors shadow-2xs text-xs"
              >
                <span>Run</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}

          {actionNotice && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center space-x-1.5 animate-in fade-in duration-150">
              <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
              <span>{actionNotice}</span>
            </div>
          )}

          {/* Spoken Output Controls (TTS) */}
          {speakingText && (
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <Volume2 className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Speech Synthesizer Playback</span>
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

          {/* Clickable Quick Action Presets */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Click or speak a command:
              </span>
              <span className="text-slate-400 text-[10px]">Tap to test command</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {sampleCommands.map((cmd) => (
                <button
                  key={cmd.text}
                  type="button"
                  onClick={() => handleApplyPreset(cmd.text)}
                  className="text-left px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 text-[11px] text-slate-700 dark:text-slate-300 transition-colors truncate"
                  title={cmd.text}
                >
                  • {cmd.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
