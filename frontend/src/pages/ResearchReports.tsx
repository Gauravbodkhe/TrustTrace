import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  FileSpreadsheet,
  FileCode,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import { ExperimentListItem, Experiment, MetricSummary } from '../types';

export const ResearchReports: React.FC = () => {
  const [experiments, setExperiments] = useState<ExperimentListItem[]>([]);
  const [selectedExpId, setSelectedExpId] = useState<string>('');
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [metrics, setMetrics] = useState<MetricSummary[]>([]);
  const [loading, setLoading] = useState(false);
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
      <div className="border-b border-slate-800/80 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2.5">
          <FileText className="h-5 w-5 text-amber-400" />
          <span>Research Reports & Reproducibility Exports</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Export standardized experimental benchmarks, statistical metrics, and raw traces for peer
          review and reproducible scientific evaluation.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Experiment Selector Bar */}
      <div className="p-4 rounded-xl bg-[#0f1524] border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <label className="block text-xs font-mono text-slate-400 mb-1">Select Experiment</label>
          <select
            value={selectedExpId}
            onChange={(e) => setSelectedExpId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-sans"
          >
            {experiments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.status})
              </option>
            ))}
          </select>
        </div>

        {selectedExpId && (
          <div className="flex items-center space-x-2 pt-4 sm:pt-0">
            <a
              href={api.exports.csvUrl(selectedExpId)}
              download
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-200 transition-colors"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </a>
            <a
              href={api.exports.jsonUrl(selectedExpId)}
              download
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-200 transition-colors"
            >
              <FileCode className="h-3.5 w-3.5 text-indigo-400" />
              <span>Export JSON</span>
            </a>
            <a
              href={api.exports.reportUrl(selectedExpId)}
              download
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Markdown Report</span>
            </a>
          </div>
        )}
      </div>

      {/* Rendered Research Report Document Preview */}
      {experiment && (
        <div className="p-8 rounded-xl bg-[#0b101c] border border-slate-800/80 space-y-6 text-slate-300 text-xs leading-relaxed font-sans shadow-lg">
          <div className="border-b border-slate-800/80 pb-4 space-y-1">
            <div className="text-[10px] font-mono uppercase text-indigo-400 tracking-wider font-semibold">
              TrustTrace Experimental Benchmark Report
            </div>
            <h2 className="text-lg font-bold text-white font-sans">{experiment.name}</h2>
            <div className="flex items-center space-x-3 text-slate-500 font-mono text-[11px] pt-1">
              <span>Experiment ID: {experiment.id}</span>
              <span>•</span>
              <span>Generated from recorded telemetry</span>
            </div>
          </div>

          {/* Section 1: Configuration */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide font-mono">
              1. Experimental Configuration & Variables
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#090d16] p-4 rounded-lg border border-slate-800/60 font-mono text-[11px]">
              <div>
                <span className="text-slate-500 block">Independent Policy:</span>
                <strong className="text-indigo-400">{experiment.policy_id}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Fault Scenario:</span>
                <strong className="text-rose-400">{experiment.scenario_id}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Random Seed:</span>
                <strong className="text-slate-200">{experiment.seed}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Trials / Repetitions:</span>
                <strong className="text-slate-200">{experiment.repetitions}</strong>
              </div>
            </div>
          </div>

          {/* Section 2: Methodology */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide font-mono">
              2. Scientific Methodology
            </h3>
            <p className="text-slate-400">
              This experiment observes an autonomous agent executing registered tools against standard
              benchmark tasks. The Fault Injector introduces simulated, controlled failures at predetermined
              or probabilistic intervals. The Diagnosis Engine parses execution status and error codes to
              categorize the fault. The Recovery Policy determines the corrective action (e.g. bounded retry
              with exponential backoff, alternative tool fallback, or safe stop).
            </p>
          </div>

          {/* Section 3: Empirical Findings */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide font-mono">
              3. Measured Evaluation Metrics
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px] border border-slate-800 rounded-lg">
                <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Metric</th>
                    <th className="py-2.5 px-4">Observed Value</th>
                    <th className="py-2.5 px-4">Definition & Operational Formula</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  <tr>
                    <td className="py-2.5 px-4 text-emerald-400 font-semibold">Task Success Rate</td>
                    <td className="py-2.5 px-4 font-bold">
                      {primaryMetric?.task_success_rate !== null &&
                      primaryMetric?.task_success_rate !== undefined
                        ? `${(primaryMetric.task_success_rate * 100).toFixed(1)}%`
                        : 'N/A'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 font-sans text-xs">
                      Runs where outcome == 'success' divided by total runs.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-indigo-400 font-semibold">Recovery Success Rate</td>
                    <td className="py-2.5 px-4 font-bold">
                      {primaryMetric?.recovery_success_rate !== null &&
                      primaryMetric?.recovery_success_rate !== undefined
                        ? `${(primaryMetric.recovery_success_rate * 100).toFixed(1)}%`
                        : 'N/A'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 font-sans text-xs">
                      Fault-injected runs that ultimately succeeded after recovery actions.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-amber-400 font-semibold">Diagnosis Accuracy</td>
                    <td className="py-2.5 px-4 font-bold">
                      {primaryMetric?.diagnosis_accuracy !== null &&
                      primaryMetric?.diagnosis_accuracy !== undefined
                        ? `${(primaryMetric.diagnosis_accuracy * 100).toFixed(1)}%`
                        : 'N/A'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 font-sans text-xs">
                      Fraction of fault-injected steps where diagnosis matched known ground truth.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-rose-400 font-semibold">Unsafe Recovery Rate</td>
                    <td className="py-2.5 px-4 font-bold">
                      {primaryMetric?.unsafe_recovery_rate !== null &&
                      primaryMetric?.unsafe_recovery_rate !== undefined
                        ? `${(primaryMetric.unsafe_recovery_rate * 100).toFixed(1)}%`
                        : '0.0%'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 font-sans text-xs">
                      Runs with invalid outputs or safety policy breaches.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-slate-300">Mean Duration (Latency)</td>
                    <td className="py-2.5 px-4 font-bold">
                      {primaryMetric?.mean_latency_ms !== null &&
                      primaryMetric?.mean_latency_ms !== undefined
                        ? `${primaryMetric.mean_latency_ms}ms`
                        : 'N/A'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 font-sans text-xs">
                      Average wall-clock execution duration per run in milliseconds.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-slate-300">P95 Latency</td>
                    <td className="py-2.5 px-4 font-bold">
                      {primaryMetric?.p95_latency_ms !== null &&
                      primaryMetric?.p95_latency_ms !== undefined
                        ? `${primaryMetric.p95_latency_ms}ms`
                        : 'N/A (sample size < 20)'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 font-sans text-xs">
                      95th percentile latency (suppressed for n &lt; 20 to prevent misleading variance).
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Threats to Validity & Limitations */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide font-mono">
              4. Threats to Validity & Limitations
            </h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li>
                <strong>Internal Validity:</strong> Simulated tools operate in-memory. While they accurately
                reproduce error signatures, they exhibit lower nominal network latency than live third-party APIs.
              </li>
              <li>
                <strong>Sample Size Constraints:</strong> Repetitions below 20 produce high confidence interval
                breadth. Claims of statistical significance should only be made on multi-trial benchmark suites.
              </li>
              <li>
                <strong>Cost Reporting Integrity:</strong> Token counts and costs are reported strictly when
                measured from live provider headers; simulated runs report cost as null rather than fabricating
                a 0 USD cost figure.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
