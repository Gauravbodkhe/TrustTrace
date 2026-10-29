import React, { useEffect, useState } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import {
  Play,
  FileSpreadsheet,
  FileCode,
  FileText,
  CheckCircle2,
  Clock,
  RotateCcw,
  ShieldAlert,
  ArrowLeft,
  ChevronRight,
  Activity,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import { Experiment, Run, MetricSummary } from '../types';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';

export const ExperimentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [metrics, setMetrics] = useState<MetricSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [expData, runsData, metricsData] = await Promise.all([
        api.experiments.get(id),
        api.experiments.listRuns(id),
        api.experiments.getMetrics(id),
      ]);
      setExperiment(expData);
      setRuns(runsData);
      setMetrics(metricsData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load experiment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleRun = async () => {
    if (!id) return;
    try {
      setRunning(true);
      await api.experiments.run(id);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to trigger experiment execution');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 font-mono text-xs space-y-3">
        <Activity className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
        <span>Loading experiment telemetry...</span>
      </div>
    );
  }

  if (!experiment) {
    return (
      <div className="p-8 text-center text-slate-500 space-y-3 font-mono">
        <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
        <p>Experiment not found or failed to load.</p>
        <NavLink to="/" className="text-indigo-600 dark:text-indigo-400 underline text-xs">
          Return to Overview
        </NavLink>
      </div>
    );
  }

  const primaryMetric = metrics.length > 0 ? metrics[0] : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <NavLink
          to="/"
          className="flex items-center space-x-1.5 text-xs font-mono text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
        </NavLink>

        {/* Export & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={api.exports.csvUrl(experiment.id)}
            download
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>CSV</span>
          </a>
          <a
            href={api.exports.jsonUrl(experiment.id)}
            download
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 transition-colors shadow-2xs"
          >
            <FileCode className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>JSON</span>
          </a>
          <a
            href={api.exports.reportUrl(experiment.id)}
            download
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 transition-colors shadow-2xs"
          >
            <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Report (MD)</span>
          </a>

          {experiment.status !== 'running' && (
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors shadow-xs disabled:opacity-50"
            >
              <Play className={`h-3.5 w-3.5 ${running ? 'animate-spin' : ''}`} />
              <span>{running ? 'Executing...' : 'Re-Run'}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2.5 shadow-2xs">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f1728] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {experiment.name}
              </h1>
              <StatusBadge status={experiment.status} size="sm" />
            </div>
            {experiment.description && (
              <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed max-w-2xl">
                {experiment.description}
              </p>
            )}
          </div>

          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 md:text-right flex-shrink-0">
            <div>ID: <span className="text-slate-700 dark:text-slate-300">{experiment.id}</span></div>
            <div>Created: {new Date(experiment.created_at).toLocaleString()}</div>
          </div>
        </div>

        {/* Configuration Parameter Badges */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            Policy: <strong className="text-indigo-600 dark:text-indigo-400">{experiment.policy_id.replace('policy_', '')}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            Scenario: <strong className="text-rose-600 dark:text-rose-400">{experiment.scenario_id}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            Agent: <strong className="text-slate-900 dark:text-slate-100">{experiment.agent_type}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            Seed: <strong className="text-slate-900 dark:text-slate-100">{experiment.seed}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            Trials: <strong className="text-slate-900 dark:text-slate-100">{experiment.repetitions}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            Max Retries: <strong className="text-slate-900 dark:text-slate-100">{experiment.max_retries}</strong>
          </span>
        </div>
      </div>

      {/* Aggregate Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <MetricCard
          label="Task Success Rate"
          value={
            primaryMetric?.task_success_rate !== null && primaryMetric?.task_success_rate !== undefined
              ? `${(primaryMetric.task_success_rate * 100).toFixed(1)}%`
              : 'N/A'
          }
          icon={CheckCircle2}
          accentColor="emerald"
          subtext={`${runs.filter((r) => r.outcome === 'success').length} / ${runs.length} runs successful`}
        />

        <MetricCard
          label="Recovery Success Rate"
          value={
            primaryMetric?.recovery_success_rate !== null &&
            primaryMetric?.recovery_success_rate !== undefined
              ? `${(primaryMetric.recovery_success_rate * 100).toFixed(1)}%`
              : 'N/A'
          }
          icon={RotateCcw}
          accentColor="indigo"
          subtext="Faulted runs recovered"
        />

        <MetricCard
          label="Diagnosis Accuracy"
          value={
            primaryMetric?.diagnosis_accuracy !== null &&
            primaryMetric?.diagnosis_accuracy !== undefined
              ? `${(primaryMetric.diagnosis_accuracy * 100).toFixed(1)}%`
              : 'N/A'
          }
          icon={ShieldAlert}
          accentColor="amber"
          subtext="Ground truth matches"
        />

        <MetricCard
          label="Mean Run Duration"
          value={
            primaryMetric?.mean_latency_ms !== null && primaryMetric?.mean_latency_ms !== undefined
              ? `${primaryMetric.mean_latency_ms}ms`
              : 'N/A'
          }
          icon={Clock}
          accentColor="slate"
          subtext={`Avg ${primaryMetric?.avg_retry_count ?? 0} retries/run`}
        />
      </div>

      {/* Executed Runs Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f1728] shadow-xs overflow-hidden">
        <div className="p-4 sm:px-5 sm:py-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Execution Runs ({runs.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click any run to inspect chronological tool execution traces and recovery decisions
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Repetitions: {experiment.repetitions}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#0b101c] text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800/80">
              <tr>
                <th className="py-3 px-5">#</th>
                <th className="py-3 px-4">Task ID</th>
                <th className="py-3 px-4">Terminal Outcome</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Retries</th>
                <th className="py-3 px-4">Token Usage</th>
                <th className="py-3 px-5 text-right">Trace Telemetry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {runs.map((run) => (
                <tr
                  key={run.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400 font-bold">
                    #{run.run_number}
                  </td>
                  <td className="py-3.5 px-4 font-sans font-medium text-slate-900 dark:text-slate-100">
                    {run.task_id}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={run.outcome || run.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                    {run.duration_ms !== null ? `${run.duration_ms}ms` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                    {run.retry_count}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                    {run.token_usage !== null ? run.token_usage : 'N/A'}
                  </td>
                  <td className="py-3.5 px-5 text-right font-sans">
                    <NavLink
                      to={`/traces?runId=${run.id}`}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium inline-flex items-center space-x-1"
                    >
                      <span>Inspect Trace</span>
                      <ChevronRight className="h-3 w-3" />
                    </NavLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
