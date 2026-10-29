import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  CheckCircle2,
  XCircle,
  Database,
  Bot,
  ShieldCheck,
  Server,
  RefreshCw,
  AlertTriangle,
  Lock,
  ExternalLink,
  Sun,
  Moon,
  Laptop,
  Palette,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import { HealthStatus } from '../types';
import { useTheme, ThemeMode } from '../context/ThemeContext';

export const Settings: React.FC = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  const checkHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const t0 = performance.now();
      const res = await api.health();
      const t1 = performance.now();
      setHealth(res);
      setPingLatency(Math.round(t1 - t0));
    } catch (err: any) {
      setError(err?.message || 'Failed to ping backend service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const themeOptions: { id: ThemeMode; label: string; desc: string; icon: React.FC<{ className?: string }> }[] = [
    {
      id: 'light',
      label: 'Light Mode',
      desc: 'Clean paper-white surface with sharp contrast for daylight research.',
      icon: Sun,
    },
    {
      id: 'dark',
      label: 'Dark Mode',
      desc: 'Deep navy-slate workspace optimized for low eye fatigue in dark environments.',
      icon: Moon,
    },
    {
      id: 'system',
      label: 'System Preference',
      desc: 'Automatically synchronizes with your operating system color scheme.',
      icon: Laptop,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
            <SettingsIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span>Platform Status & Configuration</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visual appearance preferences, engine readiness telemetry, and security architecture.
          </p>
        </div>

        <button
          onClick={checkHealth}
          disabled={loading}
          className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 shadow-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          <span>Ping Engine</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Appearance / Theme Selector Section */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-semibold text-sm">
            <Palette className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Theme & Display Preferences</span>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Active: <strong className="text-indigo-600 dark:text-indigo-400 uppercase">{resolvedTheme}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-600 dark:ring-indigo-500 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                    <Icon className="h-4 w-4" />
                  </div>
                  {isSelected && (
                    <span className="h-5 w-5 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                    {opt.label}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    {opt.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* System Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Backend API */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Backend API</span>
            <Server className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  health?.status === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                {health?.status === 'ok' ? 'Online' : 'Unreachable'}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">
              Version: {health?.version || 'v0.1.0'}
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            Latency:{' '}
            <strong className="text-slate-900 dark:text-slate-200">
              {pingLatency ? `${pingLatency}ms` : '—'}
            </strong>
          </div>
        </div>

        {/* Database */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Database Tier</span>
            <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  health?.database === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                {health?.database === 'ok' ? 'Connected' : 'Error'}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">
              Engine: SQLite (Local WAL)
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            Mode:{' '}
            <strong className="text-emerald-600 dark:text-emerald-400">
              Zero-credential local dev
            </strong>
          </div>
        </div>

        {/* AI Provider */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Agent Engine</span>
            <Bot className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
              <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                {health?.mock_mode ? 'Deterministic Mock' : 'Gemini Hybrid'}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">
              Model: {health?.mock_mode ? 'MockAgent (v1.0)' : 'Gemini 1.5 Flash'}
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            Fallback:{' '}
            <strong className="text-indigo-600 dark:text-indigo-400">Deterministic Active</strong>
          </div>
        </div>
      </div>

      {/* Environment Readiness Checklist */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200">
          System Readiness Checklist
        </h2>

        <div className="space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2.5 text-slate-800 dark:text-slate-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <span>Python 3.11 Runtime & AsyncIO Engine</span>
            </div>
            <span className="text-[11px] text-slate-500">Active</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2.5 text-slate-800 dark:text-slate-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <span>FastAPI Backend Server & Pydantic Validation</span>
            </div>
            <span className="text-[11px] text-slate-500">Port 8000</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2.5 text-slate-800 dark:text-slate-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <span>SQLite Persistence & WAL Journaling</span>
            </div>
            <span className="text-[11px] text-slate-500">trusttrace.db</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2.5 text-slate-800 dark:text-slate-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <span>Simulated Tool Registry (7 deterministic tools)</span>
            </div>
            <span className="text-[11px] text-slate-500">In-Memory</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2.5 text-slate-800 dark:text-slate-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <span>Fault Injector (10 standard failure categories)</span>
            </div>
            <span className="text-[11px] text-slate-500">Seedable RNG</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2.5 text-slate-800 dark:text-slate-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <span>Recovery Engine (Policies A through G)</span>
            </div>
            <span className="text-[11px] text-slate-500">7 Policies</span>
          </div>
        </div>
      </div>

      {/* Security Architecture Box */}
      <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-3 text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed shadow-xs">
        <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-semibold font-mono text-[11px] uppercase tracking-wider">
          <ShieldCheck className="h-4 w-4" />
          <span>Security Architecture & Secrets Hygiene</span>
        </div>
        <p>
          TrustTrace is architected with strict least-privilege principles. No API keys, database
          credentials, or service-role tokens are ever delivered to the frontend client bundle or browser
          local storage. In the backend, trace recording automatically redacts sensitive keywords
          (passwords, secrets, bearer tokens) before writing to the database or serializing export JSONs.
        </p>
      </div>
    </div>
  );
};
