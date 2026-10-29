import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  FileSpreadsheet,
  FileCode,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';
import { ExperimentListItem, Experiment, MetricSummary } from '../types';
import { EmptyState } from '../components/EmptyState';

export const ResearchReports: React.FC = () => {
  const [experiments, setExperiments] = useState<ExperimentListItem[]>([]);
  const [selectedExpId, setSelectedExpId] = useState<string>('');
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [metrics, setMetrics] = useState<MetricSummary[]>([]);
  const [_loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadList = async () => {
      try {
        const list = await api.experiments.list();
        setExperiments(list);
        if (list.length > 0) {
          setSelectedExpId(list[0].id);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load experiments');
      }
    };
    loadList();
  }, []);

  useEffect(() => {
    if (!selectedExpId) return;
    const loadExpDetails = async () => {
      try {
        setLoading(true);
        const [exp, metricList] = await Promise.all([
          api.experiments.get(selectedExpId),
          api.experiments.getMetrics(selectedExpId),
        ]);
        setExperiment(exp);
        setMetrics(metricList);
      } catch (err: any) {
        setError(err?.message || 'Failed to load report data');
      } finally {
        setLoading(false);
      }
    };
    loadExpDetails();
  }, [selectedExpId]);

  const primaryMetric = metrics.length > 0 ? metrics[0] : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
          <FileText className="h-5 w-5 text-amber-500" />
          <span>Reports</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          View and export research results, statistical metrics, and reproducible reports in CSV, JSON, and Markdown formats.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Experiment Selector Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <label className="block text-xs font-mono text-slate-500 dark:text-slate-400 mb-1.5">
            Select Target Experiment
          </label>
          <select
            value={selectedExpId}
            onChange={(e) => setSelectedExpId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
          >
            {experiments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.status})
              </option>
            ))}
          </select>
        </div>

        {selectedExpId && (
          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
            <a
              href={api.exports.csvUrl(selectedExpId)}
              download
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 transition-colors shadow-xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export CSV</span>
            </a>
            <a
              href={api.exports.jsonUrl(selectedExpId)}
              download
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 transition-colors shadow-xs"
            >
              <FileCode className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Export JSON</span>
            </a>
            <a
              href={api.exports.reportUrl(selectedExpId)}
              download
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Markdown Report</span>
            </a>
          </div>
        )}
      </div>

      {/* Rendered Research Report Document Preview */}
      {experiment ? (
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#0b101d] border border-slate-200 dark:border-slate-800/80 space-y-6 text-slate-700 dark:text-slate-300 text-xs leading-relaxed font-sans shadow-sm">
          {/* Document Header */}
          <div className="border-b border-slate-200 dark:border-slate-800/80 pb-5 space-y-1.5">
            <div className="text-[10px] font-mono uppercase text-indigo-600 dark:text-indigo-400 tracking-wider font-semibold">
              TrustTrace Experimental Benchmark Report
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-sans">
              {experiment.name}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400 font-mono text-[11px] pt-1">
              <span>ID: {experiment.id}</span>
              <span>•</span>
              <span>Status: {experiment.status}</span>
              <span>•</span>
              <span>Generated from recorded telemetry</span>
            </div>
          </div>

          {/* Section 1: Configuration */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide font-mono">
              1. Experimental Configuration & Variables
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-[#090d16] p-4 rounded-xl border border-slate-200 dark:border-slate-800/60 font-mono text-[11px]">
              <div>
                <span className="text-slate-500 block">Independent Policy:</span>
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {experiment.policy_id}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Fault Scenario:</span>
                <strong className="text-rose-600 dark:text-rose-400">
                  {experiment.scenario_id}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Random Seed:</span>
                <strong className="text-slate-900 dark:text-slate-200">{experiment.seed}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Trials / Repetitions:</span>
                <strong className="text-slate-900 dark:text-slate-200">
                  {experiment.repetitions}
                </strong>
              </div>
            </div>
          </div>

          {/* Section 2: Methodology */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide font-mono">
              2. Scientific Methodology
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              This experiment observes an autonomous agent invoking registered tools against standard
              benchmark tasks. The Fault Injector introduces simulated, controlled failures at predetermined
              or probabilistic intervals. The Diagnosis Engine parses execution status and error codes to
              categorize the fault. The Recovery Policy determines the corrective action (e.g. bounded retry
              with exponential backoff, alternative tool fallback, or safe stop).
            </p>
          </div>

          {/* Section 3: Empirical Findings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide font-mono">
              3. Measured Evaluation Metrics
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Metric</th>
                    <th className="py-2.5 px-4">Observed Value</th>
                    <th className="py-2.5 px-4 font-sans font-normal">
                      Definition & Operational Formula
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  <tr>
                    <td className="py-2.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                      Task Success Rate
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                      {primaryMetric?.task_success_rate !== null &&
                      primaryMetric?.task_success_rate !== undefined
                        ? `${(primaryMetric.task_success_rate * 100).toFixed(1)}%`
                        : 'N/A'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans text-xs">
                      Fraction of total completed trials that yielded outcome == 'success'.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-indigo-600 dark:text-indigo-400 font-semibold">
                      Recovery Success Rate
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                      {primaryMetric?.recovery_success_rate !== null &&
                      primaryMetric?.recovery_success_rate !== undefined
                        ? `${(primaryMetric.recovery_success_rate * 100).toFixed(1)}%`
                        : 'N/A'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans text-xs">
                      Fault-injected trials that successfully reached completion via policy recovery.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-amber-600 dark:text-amber-400 font-semibold">
                      Diagnosis Accuracy
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                      {primaryMetric?.diagnosis_accuracy !== null &&
                      primaryMetric?.diagnosis_accuracy !== undefined
                        ? `${(primaryMetric.diagnosis_accuracy * 100).toFixed(1)}%`
                        : 'N/A'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans text-xs">
                      Fraction of fault-injected steps where diagnosis matched known injected ground
                      truth.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-rose-600 dark:text-rose-400 font-semibold">
                      Unsafe Recovery Rate
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                      {primaryMetric?.unsafe_recovery_rate !== null &&
                      primaryMetric?.unsafe_recovery_rate !== undefined
                        ? `${(primaryMetric.unsafe_recovery_rate * 100).toFixed(1)}%`
                        : '0.0%'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans text-xs">
                      Trials producing malformed / unverified outputs or policy safety violations.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                      Mean Duration (Latency)
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                      {primaryMetric?.mean_latency_ms !== null &&
                      primaryMetric?.mean_latency_ms !== undefined
                        ? `${primaryMetric.mean_latency_ms}ms`
                        : 'N/A'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans text-xs">
                      Average wall-clock execution duration per trial in milliseconds.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">P95 Latency</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                      {primaryMetric?.p95_latency_ms !== null &&
                      primaryMetric?.p95_latency_ms !== undefined
                        ? `${primaryMetric.p95_latency_ms}ms`
                        : 'N/A (sample size < 20)'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans text-xs">
                      95th percentile latency (suppressed for n &lt; 20 to prevent misleading variance).
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Threats to Validity & Limitations */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide font-mono">
              4. Threats to Validity & Scientific Limitations
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600 dark:text-slate-400 pl-1">
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Internal Validity:</strong>{' '}
                Simulated tools execute deterministically in memory. While they accurately model error
                signatures, baseline nominal network jitter differs from live cloud endpoints.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">
                  Sample Size Constraints:
                </strong>{' '}
                Repetitions below 20 produce wider confidence intervals. Statistical significance claims
                should be corroborated across multi-repetition benchmark runs.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">
                  Cost Reporting Integrity:
                </strong>{' '}
                Token counts and costs are reported strictly when measured from live AI provider
                headers; simulated runs report cost as null rather than fabricating an artificial 0 USD
                cost.
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No experiment selected"
          description="Select an experiment above or launch a new run to view its scientific report."
          actionLabel="Launch Experiment"
          onAction={() => (window.location.href = '/experiments/new')}
        />
      )}
    </div>
  );
};
