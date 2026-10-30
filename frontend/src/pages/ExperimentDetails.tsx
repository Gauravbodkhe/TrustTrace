import React, { useEffect, useState } from 'react';
import { useParams, NavLink, useNavigate } from 'react-router-dom';
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
  HelpCircle,
  Lightbulb,
  Compass,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';
import { Experiment, Run, MetricSummary, Task } from '../types';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';

export const ExperimentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [metrics, setMetrics] = useState<MetricSummary[]>([]);
  const [tasks, setTasks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [expData, runsData, metricsData, taskList] = await Promise.all([
        api.experiments.get(id),
        api.experiments.listRuns(id),
        api.experiments.getMetrics(id),
        api.tasks.list().catch(() => []),
      ]);
      setExperiment(expData);
      setRuns(runsData);
      setMetrics(metricsData);

      const taskMap: Record<string, string> = {};
      taskList.forEach((t: Task) => {
        taskMap[t.id] = t.name;
      });
      setTasks(taskMap);
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
        <span>Loading experiment results...</span>
      </div>
    );
  }

  if (!experiment) {
    return (
      <div className="p-8 text-center text-slate-500 space-y-3">
        <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Experiment not found
        </p>
        <p className="text-xs text-slate-500">The requested experiment does not exist or has been deleted.</p>
        <NavLink
          to="/experiments"
          className="inline-block mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium"
        >
          Back to Experiments
        </NavLink>
      </div>
    );
  }

  const primaryMetric = metrics.length > 0 ? metrics[0] : null;
  const successfulRuns = runs.filter((r) => r.outcome === 'success').length;
  const totalRuns = runs.length;

  // Formulate "What happened?", "Why did it happen?", "What can I investigate next?"
  const generateInterpretation = () => {
    const policyName = experiment.policy_id.replace('policy_', '').replace('_', ' ').toUpperCase();
    const scenarioName = experiment.scenario_id.replace('_', ' ');

    let whatHappened = '';
    if (totalRuns === 0) {
      whatHappened = 'This experiment has been configured but not executed yet. Click "Run Experiment" above to start testing.';
    } else if (successfulRuns === totalRuns) {
      whatHappened = `All ${totalRuns} tasks completed successfully (${(100).toFixed(0)}% success rate) despite the injected ${scenarioName} failure.`;
    } else if (successfulRuns === 0) {
      whatHappened = `All ${totalRuns} tasks failed because the agent could not recover from the simulated ${scenarioName} condition.`;
    } else {
      whatHappened = `${successfulRuns} of ${totalRuns} tasks succeeded (${Math.round((successfulRuns / totalRuns) * 100)}% success rate), while ${totalRuns - successfulRuns} task(s) failed.`;
    }

    let whyItHappened = '';
    if (experiment.scenario_id === 'no_fault') {
      whyItHappened = 'No faults were injected (baseline control run). The agent executed tools under nominal conditions.';
    } else if (experiment.policy_id.includes('no_recovery')) {
      whyItHappened = `Tools encountered the simulated "${scenarioName}" fault. Under Policy A (No Recovery), the agent does not retry and immediately halts on the first error.`;
    } else if (experiment.policy_id.includes('budget_aware')) {
      whyItHappened = `The agent encountered "${scenarioName}". Policy G (Budget-Aware Multi-Strategy) diagnosed the error type and dynamically chose the optimal recovery action while monitoring retry budgets.`;
    } else if (experiment.policy_id.includes('exponential_backoff')) {
      whyItHappened = `The tool threw a fault, and the agent waited with progressive delay intervals before retrying, allowing temporary blips to clear.`;
    } else if (experiment.policy_id.includes('fallback_tool')) {
      whyItHappened = `When the primary tool encountered a failure, the agent pivoted to alternative secondary tools or cached fallbacks.`;
    } else {
      whyItHappened = `The agent encountered the configured "${scenarioName}" condition and executed recovery routines governed by ${policyName}.`;
    }

    let nextStep = '';
    if (experiment.policy_id.includes('no_recovery')) {
      nextStep = 'Try running the exact same scenario with Policy C (Exponential Backoff) or Policy G (Budget-Aware) to see how automated recovery improves the success rate.';
    } else if (experiment.policy_id.includes('immediate_retry')) {
      nextStep = 'Compare this run against Policy C (Exponential Backoff) in Policy Comparison to test whether delayed retries decrease server strain and reduce rate-limit thrashing.';
    } else if (experiment.policy_id.includes('budget_aware')) {
      nextStep = 'Benchmark Policy G against severe or combined failure modes (e.g. Stale Data + Schema Mismatch) or switch to Gemini Flash for real LLM evaluation.';
    } else {
      nextStep = 'Open the Policy Comparison page to see how this strategy compares side-by-side against all 7 policies on latency, success rate, and retry overhead.';
    }

    return { whatHappened, whyItHappened, nextStep };
  };

  const interpretation = generateInterpretation();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <NavLink
          to="/experiments"
          className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Previous Tests</span>
        </NavLink>

        {/* Export & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={api.exports.csvUrl(experiment.id)}
            download
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-colors shadow-2xs"
            title="Download raw run data as CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV</span>
          </a>
          <a
            href={api.exports.jsonUrl(experiment.id)}
            download
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-colors shadow-2xs"
            title="Download complete telemetry as JSON"
          >
            <FileCode className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Export JSON</span>
          </a>
          <a
            href={api.exports.reportUrl(experiment.id)}
            download
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-colors shadow-2xs"
            title="Download Markdown report"
          >
            <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Markdown</span>
          </a>

          {experiment.status !== 'running' && (
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors shadow-xs disabled:opacity-50"
            >
              <Play className={`h-3.5 w-3.5 ${running ? 'animate-spin' : ''}`} />
              <span>{running ? 'Running...' : 'Run Again'}</span>
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
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                {experiment.description}
              </p>
            )}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 md:text-right flex-shrink-0">
            <div>
              Created: {new Date(experiment.created_at).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className="font-mono text-[10px] text-slate-400 mt-0.5">ID: {experiment.id}</div>
          </div>
        </div>

        {/* Configuration Parameter Badges */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs">
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            Method: <strong className="text-indigo-600 dark:text-indigo-400">{experiment.policy_id.replace('policy_', '')}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            Test Problem: <strong className="text-rose-600 dark:text-rose-400">{experiment.scenario_id}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            AI Runner: <strong className="text-slate-900 dark:text-slate-100">{experiment.agent_type === 'mock' ? 'Fast Simulation' : 'Gemini AI'}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono">
            Random Seed: {experiment.seed}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            Runs: {experiment.repetitions}x
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            Max Retries: {experiment.max_retries}
          </span>
        </div>
      </div>

      {/* Results Summary (5 Key KPI Cards with Tooltips) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <MetricCard
          label="Tasks Completed Successfully"
          value={totalRuns > 0 ? `${successfulRuns} of ${totalRuns}` : '0 of 0'}
          icon={CheckCircle2}
          accentColor="emerald"
          subtext={totalRuns > 0 ? `${Math.round((successfulRuns / totalRuns) * 100)}% overall success` : 'No runs'}
          tooltip="Total number of tasks that finished successfully vs total attempted"
        />

        <MetricCard
          label="Errors Fixed Successfully"
          value={
            primaryMetric?.recovery_success_rate !== null &&
            primaryMetric?.recovery_success_rate !== undefined
              ? `${(primaryMetric.recovery_success_rate * 100).toFixed(0)}%`
              : 'N/A'
          }
          icon={RotateCcw}
          accentColor="indigo"
          subtext="Fixed after problem"
          tooltip="Percentage of problems that the AI fixed successfully without stopping"
        />

        <MetricCard
          label="Problem Detection Accuracy"
          value={
            primaryMetric?.diagnosis_accuracy !== null &&
            primaryMetric?.diagnosis_accuracy !== undefined
              ? `${(primaryMetric.diagnosis_accuracy * 100).toFixed(0)}%`
              : 'N/A'
          }
          icon={ShieldAlert}
          accentColor="amber"
          subtext="Correctly found problem"
          tooltip="How often the AI correctly found the test problem"
        />

        <MetricCard
          label="Time Taken"
          value={
            primaryMetric?.mean_latency_ms !== null && primaryMetric?.mean_latency_ms !== undefined
              ? `${Math.round(primaryMetric.mean_latency_ms)}ms`
              : 'N/A'
          }
          icon={Clock}
          accentColor="slate"
          subtext="Per task run"
          tooltip="Average time taken across all completed task runs"
        />

        <MetricCard
          label="Average Retries"
          value={
            primaryMetric?.avg_retry_count !== null && primaryMetric?.avg_retry_count !== undefined
              ? `${primaryMetric.avg_retry_count} retries`
              : '0 retries'
          }
          icon={Activity}
          accentColor="slate"
          subtext="Average per task"
          tooltip="Average number of retries before task finished or stopped"
        />
      </div>

      {/* Results Interpretation Section */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f1728] shadow-xs space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Lightbulb className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            What the Results Mean
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* What happened? */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>What happened?</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {interpretation.whatHappened}
            </p>
          </div>

          {/* Why did it happen? */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>Why did it happen?</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {interpretation.whyItHappened}
            </p>
          </div>

          {/* What can I try next? */}
          <div className="p-4 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-1.5">
            <div className="font-semibold text-indigo-900 dark:text-indigo-200 flex items-center space-x-1.5">
              <Compass className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>What can I try next?</span>
            </div>
            <p className="text-indigo-800/80 dark:text-indigo-300/90 leading-relaxed">
              {interpretation.nextStep}
            </p>
            <div className="pt-2">
              <NavLink
                to="/comparison"
                className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center space-x-1"
              >
                <span>Compare Methods</span>
                <ArrowRight className="h-3 w-3" />
              </NavLink>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Run List */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f1728] shadow-xs overflow-hidden">
        <div className="p-4 sm:px-5 sm:py-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Task Runs ({runs.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Individual task runs. Click "View Activity" to see the step-by-step history.
            </p>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {experiment.repetitions} run(s) per task
          </span>
        </div>

        <div className="overflow-x-auto">
          {runs.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No task runs recorded. Click "Run Again" above to start.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#0b101c] text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800/80 font-medium">
                <tr>
                  <th className="py-3 px-5">#</th>
                  <th className="py-3 px-4">Task Name</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4">Test Problem</th>
                  <th className="py-3 px-4">Retries</th>
                  <th className="py-3 px-4">Time Taken</th>
                  <th className="py-3 px-5 text-right">Step-by-Step</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3.5 px-5 font-mono text-slate-500 dark:text-slate-400 font-bold">
                      #{run.run_number}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                      <div>{tasks[run.task_id] || run.task_id}</div>
                      <div className="font-mono text-[10px] text-slate-400">{run.task_id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={run.outcome || run.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {run.scenario_id}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {run.retry_count}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {run.duration_ms !== null ? `${run.duration_ms}ms` : '—'}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <NavLink
                        to={`/traces?runId=${run.id}`}
                        className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-medium inline-flex items-center space-x-1 transition-colors border border-indigo-200 dark:border-indigo-800"
                      >
                        <span>View Activity</span>
                        <ChevronRight className="h-3 w-3" />
                      </NavLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
