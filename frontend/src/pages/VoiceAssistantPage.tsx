import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoiceRecognition } from '../voice/useVoiceRecognition';
import { useSpeechSynthesis } from '../voice/useSpeechSynthesis';
import { parseVoiceCommand } from '../voice/commandParser';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Command,
  ArrowRight,
  MessageSquare,
  Bot,
  HelpCircle,
  Play,
  RotateCcw,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  action?: {
    label: string;
    path: string;
  };
}

const SAMPLE_PROMPTS = [
  'Create new experiment with bounded retry',
  'Run test case TC-001',
  'Explain budget aware recovery',
  'Compare recovery policies',
  'What is the difference between safe stop and fallback?',
];

export const VoiceAssistantPage: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your TrustTrace voice copilot. You can speak commands, formulate research hypotheses, or ask questions about AI recovery policies.',
    },
  ]);
  const [inputText, setInputText] = useState('');

  const { speak, isPlaying, stop: stopSpeech, isSupported: speechSupported } = useSpeechSynthesis();

  const handleVoiceCommand = (transcript: string) => {
    if (!transcript.trim()) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text: transcript,
    };
    setMessages((prev) => [...prev, userMsg]);

    const parsed = parseVoiceCommand(transcript);

    let replyText = '';
    let actionItem: { label: string; path: string } | undefined;

    switch (parsed.intent) {
      case 'NAVIGATE_NEW_EXPERIMENT':
        replyText = 'Opening the experiment creation wizard.';
        actionItem = { label: 'Open Experiment Form', path: '/experiments/new' };
        break;
      case 'NAVIGATE_EXPERIMENTS':
        replyText = 'Navigating to experiment history.';
        actionItem = { label: 'View Experiment History', path: '/experiments' };
        break;
      case 'NAVIGATE_COMPARISON':
        replyText = 'Opening benchmark recovery strategy comparison.';
        actionItem = { label: 'Compare Recovery Methods', path: '/comparison' };
        break;
      case 'NAVIGATE_REPORTS':
        replyText = 'Opening research reports and analytics.';
        actionItem = { label: 'View Reports', path: '/reports' };
        break;
      case 'NAVIGATE_DASHBOARD':
        replyText = 'Returning to the overview dashboard.';
        actionItem = { label: 'Go to Overview', path: '/' };
        break;
      case 'RUN_BENCHMARK':
        replyText = 'Opening standard test case library to run benchmarks.';
        actionItem = { label: 'View Test Cases', path: '/test-cases' };
        break;
      case 'EXPLAIN_FAILURE':
        replyText =
          'In AI reliability benchmarking, recovery strategies determine how an autonomous agent responds to tool faults like timeouts, malformed JSON, or rate limits. Bounded retry and fallback are effective for transient errors.';
        break;
      default:
        replyText =
          parsed.description ||
          `I heard: "${transcript}". You can ask me to create an experiment, run a test case, or compare recovery strategies.`;
        break;
    }

    const assistantMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'assistant',
      text: replyText,
      action: actionItem,
    };

    setMessages((prev) => [...prev, assistantMsg]);
    speak(replyText);

    if (actionItem && !parsed.requiresConfirmation) {
      setTimeout(() => navigate(actionItem.path), 2000);
    }
  };

  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    isSupported: micSupported,
  } = useVoiceRecognition(handleVoiceCommand);

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      if (isPlaying) stopSpeech();
      startListening();
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    handleVoiceCommand(text);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Voice Assistant
          </h1>
          <span className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
            Interactive Speech AI
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Speak natural commands to execute tests, generate hypotheses, or listen to explanations of recovery strategies.
        </p>
      </div>

      {/* Main Interactive Stage */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs flex flex-col items-center text-center relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Dynamic Mic Orb */}
        <div className="relative mb-6">
          {isListening && (
            <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
          )}
          {isPlaying && (
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-pulse" />
          )}
          <button
            onClick={toggleMic}
            className={`relative flex h-24 w-24 items-center justify-center rounded-full shadow-xl transition-all cursor-pointer ${
              isListening
                ? 'bg-rose-600 text-white shadow-rose-600/40 scale-105'
                : isPlaying
                ? 'bg-indigo-600 text-white shadow-indigo-600/40'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-slate-200/50 dark:shadow-none'
            }`}
            title={isListening ? 'Click to stop listening' : 'Click to start speaking'}
          >
            {isListening ? (
              <Mic className="h-10 w-10 animate-bounce" />
            ) : (
              <Mic className="h-10 w-10" />
            )}
          </button>
        </div>

        {/* State Indicator */}
        <div className="space-y-1 mb-6">
          <p className="text-base font-bold text-slate-900 dark:text-white">
            {isListening
              ? 'Listening to your voice...'
              : isPlaying
              ? 'Speaking response...'
              : 'Tap the microphone to speak'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {interimTranscript || transcript ? (
              <span className="italic font-medium text-indigo-600 dark:text-indigo-400">
                "{interimTranscript || transcript}"
              </span>
            ) : micSupported ? (
              'Or choose one of the suggested prompts below'
            ) : (
              'Microphone unavailable. You can type commands directly in the input box below.'
            )}
          </p>
        </div>

        {/* Spoken audio controls */}
        {isPlaying && (
          <div className="mb-6 flex items-center gap-2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-4 py-1.5 text-xs text-indigo-700 dark:text-indigo-300">
            <Volume2 className="h-4 w-4 animate-pulse" />
            <span>Audio playback active</span>
            <button
              onClick={stopSpeech}
              className="ml-2 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <VolumeX className="h-3.5 w-3.5" /> Stop
            </button>
          </div>
        )}

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap justify-center gap-2 max-w-xl">
          {SAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleVoiceCommand(prompt)}
              className="rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
            >
              "{prompt}"
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Thread */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Voice Dialogue History
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            {messages.length} messages
          </span>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 text-xs ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`rounded-2xl px-4 py-2.5 max-w-[85%] leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs'
                }`}
              >
                <p>{msg.text}</p>
                {msg.action && (
                  <button
                    onClick={() => navigate(msg.action!.path)}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 px-3 py-1 text-[11px] font-semibold shadow-xs hover:bg-slate-50 transition-colors"
                  >
                    <span>{msg.action.label}</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Text Input Fallback Bar */}
        <form onSubmit={handleManualSubmit} className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a voice command or question..."
            className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
