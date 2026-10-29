import React, { useEffect, useState } from 'react';
import { useParams, NavLink, useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  Play,
  Download,
  FileSpreadsheet,
  FileCode,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  ShieldAlert,
  ArrowLeft,
  ChevronRight,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';
import { Experiment, Run, MetricSummary } from '../types';

export const ExperimentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
      <div className="flex items-center justify-center h-64 text-slate-500 font-mono text-xs">
        <Activity className="h-5 w-5 animate-spin mr-2 text-indigo-400" />
        <span>Loading experiment records...</span>
      </div>
    );
  }

  if (!experiment) {
    return (
      <div className="p-8 text-center text-slate-400 space-y-3 font-mono">
        <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto" />
        <p>Experiment not found or failed to load.</p>
        <NavLink to="/" className="text-indigo-400 underline text-xs">
          Return to Overview
        </NavLink>
      </div>
    );
  }

  const primaryMetric = metrics.length > 0 ? metrics[0] : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
        <NavLink
          to="/"
          className="flex items-center space-x-1.5 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
        </NavLink>

        {/* Export Actions */}
        <div className="flex items-center space-x-2">
          <a
            href={api.exports.csvUrl(experiment.id)}
            download
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-mono transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span>CSV</span>
          </a>
          <a
            href={api.exports.jsonUrl(experiment.id)}
            download
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-mono transition-colors"
          >
            <FileCode className="h-3.5 w-3.5 text-indigo-400" />
            <span>JSON</span>
          </a>
          <a
            href={api.exports.reportUrl(experiment.id)}
            download
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-mono transition-colors"
          >
            <FileText className="h-3.5 w-3.5 text-amber-400" />
            <span>Report (MD)</span>
          </a>
          {experiment.status !== 'running' && (
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors shadow-sm disabled:opacity-50"
            >
              <Play className={`h-3.5 w-3.5 ${running ? 'animate-spin' : ''}`} />
              <span>{running ? 'Running...' : 'Re-Run'}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="p-6 rounded-xl bg-[#0f1524] border border-slate-800/80 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-lg font-bold text-white tracking-tight">{experiment.name}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                  experiment.status === 'completed'
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                    : experiment.status === 'running'
                    ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 animate-pulse'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {experiment.status}
              </span>
            </div>
            {experiment.description && (
              <p className="text-xs text-slate-400 mt-1 font-sans">{experiment.description}</p>
            )}
          </div>
          <div className="text-[11px] font-mono text-slate-500 text-right">
            <div>ID: {experiment.id.slice(0, 8)}...</div>
            <div>Created: {new Date(experiment.created_at).toLocaleString()}</div>
          </div>
        </div>

        {/* Configuration Pills */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/60 text-xs font-mono">
          <span className="px-2.5 py-1 rounded bg-[#090d16] border border-slate-800 text-slate-300">
            Policy:{' '}
            <strong className="text-indigo-400">{experiment.policy_id.replace('policy_', '')}</strong>
          </span>
          <span className="px-2.5 py-1 rounded bg-[#090d16] border border-slate-800 text-slate-300">
            Scenario: <strong className="text-rose-400">{experiment.scenario_id}</strong>
          </span>
          <span className="px-2.5 py-1 rounded bg-[#090d16] border border-slate-800 text-slate-300">
            Agent: <strong className="text-slate-200">{experiment.agent_type}</strong>
          </span>
          <span className="px-2.5 py-1 rounded bg-[#090d16] border border-slate-800 text-slate-300">
            Repetitions: <strong className="text-slate-200">{experiment.repetitions}</strong>
          </span>
          <span className="px-2.5 py-1 rounded bg-[#090d16] border border-slate-800 text-slate-300">
            Seed: <strong className="text-slate-200">{experiment.seed}</strong>
          </span>
          <span className="px-2.5 py-1 rounded bg-[#090d16] border border-slate-800 text-slate-300">
            Retries: <strong className="text-slate-200">{experiment.max_retries} max</strong>
          </span>
        </div>
      </div>

      {/* Aggregate Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-[#0f1524] border border-slate-800/80">
          <div className="text-xs text-slate-400">Task Success Rate</div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
            {primaryMetric?.task_success_rate !== null && primaryMetric?.task_success_rate !== undefined
              ? `${(primaryMetric.task_success_rate * 100).toFixed(1)}%`
              : 'N/A'}
          </div>
          <div className="mt-1 text-[10px] text-slate-500 font-mono">
            {runs.filter((r) => r.outcome === 'success').length} / {runs.length} runs
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0f1524] border border-slate-800/80">
          <div className="text-xs text-slate-400">Recovery Success Rate</div>
          <div className="mt-2 text-2xl font-bold font-mono text-indigo-400">
            {primaryMetric?.recovery_success_rate !== null &&
            primaryMetric?.recovery_success_rate !== undefined
              ? `${(primaryMetric.recovery_success_rate * 100).toFixed(1)}%`
              : 'N/A'}
          </div>
          <div className="mt-1 text-[10px] text-slate-500 font-mono">
            Fault-injected runs recovered
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0f1524] border border-slate-800/80">
          <div className="text-xs text-slate-400">Diagnosis Accuracy</div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-400">
            {primaryMetric?.diagnosis_accuracy !== null &&
            primaryMetric?.diagnosis_accuracy !== undefined
              ? `${(primaryMetric.diagnosis_accuracy * 100).toFixed(1)}%`
              : 'N/A'}
          </div>
          <div className="mt-1 text-[10px] text-slate-500 font-mono">Ground truth classification</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0f1524] border border-slate-800/80">
          <div className="text-xs text-slate-400">Mean Run Duration</div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-200">
            {primaryMetric?.mean_latency_ms !== null && primaryMetric?.mean_latency_ms !== undefined
              ? `${primaryMetric.mean_latency_ms}ms`
              : 'N/A'}
          </div>
          <div className="mt-1 text-[10px] text-slate-500 font-mono">
            Avg {primaryMetric?.avg_retry_count ?? 0} retries/run
          </div>
        </div>
      </div>

      {/* Executed Runs Table */}
      <div className="rounded-xl bg-[#0f1524] border border-slate-800/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Execution Runs ({runs.length})</h2>
            <p className="text-xs text-slate-400">
              Click any run to inspect the detailed chronological tool execution trace
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Repetitions: {experiment.repetitions}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b101c] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800/80">
              <tr>
                <th className="py-3 px-5">#</th>
                <th className="py-3 px-4">Task</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Retries</th>
                <th className="py-3 px-4">Tokens</th>
                <th className="py-3 px-5 text-right">Trace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-5 text-slate-500">#{run.run_number}</td>
                  <td className="py-3.5 px-4 font-sans font-medium text-slate-200">{run.task_id}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        run.outcome === 'success'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                          : run.outcome === 'failure'
                          ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                          : run.outcome === 'unsafe'
                          ? 'bg-red-950/80 text-red-300 border border-red-700/50'
                          : run.outcome === 'clarification_needed'
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {run.outcome || run.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {run.duration_ms !== null ? `${run.duration_ms}ms` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{run.retry_count}</td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {run.token_usage !== null ? run.token_usage : 'N/A'}
                  </td>
                  <td className="py-3.5 px-5 text-right font-sans">
                    <NavLink
                      to={`/traces?runId=${run.id}`}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center space-x-1"
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
