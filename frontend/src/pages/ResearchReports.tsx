import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  FileSpreadsheet,
  FileCode,
  Printer,
  AlertTriangle,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import {
  ExperimentListItem,
  Experiment,
  MetricSummary,
  OverallReportData,
} from '../types';
import { EmptyState } from '../components/EmptyState';

export const ResearchReports: React.FC = () => {
  const navigate = useNavigate();
  const [reportScope, setReportScope] = useState<'overall' | 'single'>('overall');

  // Overall Report State
  const [overallData, setOverallData] = useState<OverallReportData | null>(null);
  const [loadingOverall, setLoadingOverall] = useState(false);
  const [policyFilter, setPolicyFilter] = useState('all');
  const [scenarioFilter, setScenarioFilter] = useState('all');

  // Single Experiment State
  const [experiments, setExperiments] = useState<ExperimentListItem[]>([]);
  const [selectedExpId, setSelectedExpId] = useState<string>('');
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [metrics, setMetrics] = useState<MetricSummary[]>([]);
  const [loadingSingle, setLoadingSingle] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // 1. Load experiment list on mount
  useEffect(() => {
    const loadList = async () => {
      try {
        const list = await api.experiments.list();
        setExperiments(list);
        if (list.length > 0 && !selectedExpId) {
          setSelectedExpId(list[0].id);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load experiments');
      }
    };
    loadList();
  }, []);

  // 2. Load overall report data when overall tab is active or filters change
  const fetchOverallReport = async () => {
    try {
      setLoadingOverall(true);
      setError(null);
      const data = await api.reports.overall({
        policy_id: policyFilter,
        scenario_id: scenarioFilter,
      });
      setOverallData(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate overall report data');
    } finally {
      setLoadingOverall(false);
    }
  };

  useEffect(() => {
    if (reportScope === 'overall') {
      fetchOverallReport();
    }
  }, [reportScope, policyFilter, scenarioFilter]);

  // 3. Load single experiment details
  useEffect(() => {
    if (reportScope !== 'single' || !selectedExpId) return;
    const loadExpDetails = async () => {
      try {
        setLoadingSingle(true);
        setError(null);
        const [exp, metricList] = await Promise.all([
          api.experiments.get(selectedExpId),
          api.experiments.getMetrics(selectedExpId),
        ]);
        setExperiment(exp);
        setMetrics(metricList);
      } catch (err: any) {
        setError(err?.message || 'Failed to load single experiment report');
      } finally {
        setLoadingSingle(false);
      }
    };
    loadExpDetails();
  }, [reportScope, selectedExpId]);

  const handlePrint = () => {
    window.print();
  };

  const primaryMetric = metrics.length > 0 ? metrics[0] : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 print:p-0 print:max-w-none">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
              <FileText className="h-5 w-5" />
            </div>
            <span>Research Reports & Vector PDF Export</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Download and print comprehensive, reproducible experimental reports covering recovery policies, injected fault breakdowns, and empirical evidence.
          </p>
        </div>

        {/* Global Quick Action: Print */}
        <button
          onClick={handlePrint}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors shadow-2xs self-start md:self-auto"
          title="Print this report using browser print"
        >
          <Printer className="h-3.5 w-3.5 text-slate-500" />
          <span>Print Report</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2 print:hidden">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Prominent Generate Overall Report Banner */}
      <div className="p-5 rounded-xl border border-indigo-200 dark:border-indigo-800/70 bg-gradient-to-r from-indigo-50/70 via-white to-indigo-50/30 dark:from-indigo-950/40 dark:via-[#0c121e] dark:to-indigo-950/20 shadow-xs print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-600 text-white shadow-2xs">
                Official Benchmark
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Generate Complete Overall Report
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Synthesizes all executed experiments, compares Recovery Policies A through G, analyzes injected tool faults, and produces an exportable vector PDF with formal academic formatting.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={api.reports.overallPdfUrl({ policy_id: policyFilter, scenario_id: scenarioFilter })}
              download="trusttrace_overall_research_report.pdf"
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs shadow-indigo-600/30 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download Vector PDF</span>
            </a>

            <a
              href={api.reports.overallMarkdownUrl({ policy_id: policyFilter, scenario_id: scenarioFilter })}
              download="trusttrace_overall_research_report.md"
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-2xs transition-colors"
            >
              <FileCode className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Markdown</span>
            </a>
          </div>
        </div>
      </div>

      {/* Scope Selector Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 print:hidden">
        <div className="flex space-x-2">
          <button
            onClick={() => setReportScope('overall')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              reportScope === 'overall'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Combined Overall Report (All Experiments)
          </button>
          <button
            onClick={() => setReportScope('single')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              reportScope === 'single'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Single Experiment Focus
          </button>
        </div>

        {reportScope === 'overall' && (
          <button
            onClick={fetchOverallReport}
            disabled={loadingOverall}
            className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors p-1"
            title="Refresh report data"
          >
            <RefreshCw className={`h-3 w-3 ${loadingOverall ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* ─── TAB 1: OVERALL COMBINED REPORT ─────────────────────────────────── */}
      {reportScope === 'overall' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0f1728] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-3 print:hidden">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
              <Filter className="h-3.5 w-3.5" />
              <span>Scope Filters:</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-mono text-slate-400">Policy:</span>
              <select
                value={policyFilter}
                onChange={(e) => setPolicyFilter(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none font-sans"
              >
                <option value="all">All Policies (A–G)</option>
                <option value="policy_a_no_recovery">Policy A: No Recovery</option>
                <option value="policy_b_simple_retry">Policy B: Simple Retry</option>
                <option value="policy_c_validation_retry">Policy C: Validation Retry</option>
                <option value="policy_d_alternative_tool">Policy D: Alternative Tool</option>
                <option value="policy_e_context_trimming">Policy E: Context Trimming</option>
                <option value="policy_f_safe_fallback">Policy F: Safe Fallback</option>
                <option value="policy_g_budget_aware">Policy G: Budget-Aware Adaptive</option>
              </select>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-mono text-slate-400">Scenario:</span>
              <select
                value={scenarioFilter}
                onChange={(e) => setScenarioFilter(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none font-sans"
              >
                <option value="all">All Fault Scenarios</option>
                <option value="transient_error_step1">Transient HTTP 503</option>
                <option value="rate_limit_step1">Rate Limit Exceeded (429)</option>
                <option value="schema_mismatch_step1">Schema Mismatch</option>
                <option value="tool_offline_step1">Tool Unavailable (500)</option>
                <option value="network_timeout_step1">Network Timeout</option>
                <option value="budget_exhaustion_step1">Token Exhaustion</option>
              </select>
            </div>
          </div>

          {/* Rendered Overall Report Document */}
          {loadingOverall ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
              <span>Synthesizing multi-experiment telemetry...</span>
            </div>
          ) : overallData ? (
            <div className="p-6 sm:p-10 rounded-2xl bg-white dark:bg-[#0b101d] border border-slate-200 dark:border-slate-800/80 space-y-8 text-slate-700 dark:text-slate-300 text-xs leading-relaxed font-sans shadow-sm print:shadow-none print:border-none print:p-0">
              {/* Document Header & Metadata */}
              <div className="border-b border-slate-200 dark:border-slate-800/80 pb-6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-indigo-600 dark:text-indigo-400 tracking-wider font-bold">
                    TrustTrace Formal Research Benchmark Report
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {new Date().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-sans">
                  {overallData.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {overallData.subtitle}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    Scope: {overallData.scope}
                  </span>
                  <span>•</span>
                  <span>Experiments: {overallData.total_experiments}</span>
                  <span>•</span>
                  <span>Evaluated Runs: {overallData.total_runs}</span>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Overall Success Rate: {(overallData.overall_success_rate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Section 1: Executive Summary */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide font-mono flex items-center space-x-2">
                  <span>1. Executive Summary & Top Findings</span>
                </h3>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <p className="leading-relaxed">
                    This evaluation examines agent resilience across controlled tool-failure injections.
                    The empirical data demonstrates that unguided retries (Policy B) fail completely on permanent errors
                    (e.g., schema mismatches and tool outages), wasting latency and token budget without resolution.
                  </p>
                  <p className="leading-relaxed font-medium text-slate-800 dark:text-slate-200">
                    {overallData.best_policy_summary}
                  </p>
                </div>
              </div>

              {/* Section 2: Policy Comparison Matrix */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide font-mono">
                    2. Recovery Policy Comparison Matrix (Policies A–G)
                  </h3>
                  <NavLink
                    to="/comparison"
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 print:hidden"
                  >
                    <span>Full Comparison View</span>
                    <ChevronRight className="h-3 w-3" />
                  </NavLink>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-50 dark:bg-[#0c121e] text-slate-500 dark:text-slate-400 uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Policy ID & Name</th>
                        <th className="py-2.5 px-3 text-right">Runs (N)</th>
                        <th className="py-2.5 px-3 text-right">Task Success</th>
                        <th className="py-2.5 px-3 text-right">Recovery Rate</th>
                        <th className="py-2.5 px-3 text-right">Mean Latency</th>
                        <th className="py-2.5 px-3 text-right">Avg Retries</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {overallData.policy_comparison.map((p) => {
                        const succPct =
                          p.task_success_rate !== null
                            ? `${(p.task_success_rate * 100).toFixed(1)}%`
                            : 'N/A';
                        const recPct =
                          p.recovery_success_rate !== null
                            ? `${(p.recovery_success_rate * 100).toFixed(1)}%`
                            : 'N/A';
                        return (
                          <tr key={p.policy_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                              {p.policy_name}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                              {p.sample_size}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {succPct}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                              {recPct}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                              {p.mean_latency_ms !== null ? `${p.mean_latency_ms.toFixed(0)}ms` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                              {p.avg_retry_count !== null ? p.avg_retry_count.toFixed(1) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Injected Failure Distribution */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide font-mono">
                  3. Injected Fault Distribution & Recovery Resilience
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-50 dark:bg-[#0c121e] text-slate-500 dark:text-slate-400 uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Fault Category</th>
                        <th className="py-2.5 px-3 font-sans">Description</th>
                        <th className="py-2.5 px-3 text-right">Injected Total</th>
                        <th className="py-2.5 px-3 text-right">Recovered</th>
                        <th className="py-2.5 px-3 text-right">Resilience Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {overallData.failure_distribution.map((f) => (
                        <tr key={f.category} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="py-2.5 px-3 font-semibold text-rose-600 dark:text-rose-400">
                            {f.category}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-xs text-slate-600 dark:text-slate-400">
                            {f.description}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-800 dark:text-slate-200">
                            {f.count}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-800 dark:text-slate-200">
                            {f.recovered_runs}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                            {(f.recovery_rate * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 4: Threats to Validity and Methodology */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide font-mono">
                  4. Threats to Validity & Scientific Honesty
                </h3>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-slate-600 dark:text-slate-400 text-xs">
                  <p>
                    <strong>Controlled Deterministic Mocks:</strong> Baseline experiments utilize deterministic mock agents and predictable fault injection scenarios to ensure complete reproducibility across randomized seeds.
                  </p>
                  <p>
                    <strong>Cost Telemetry Accounting:</strong> To maintain strict academic integrity, external LLM dollar costs are recorded as null when running against deterministic mocks rather than fabricating synthetic dollar figures.
                  </p>
                </div>
              </div>

              {/* Section 5: Appendix of Recent Traces */}
              {overallData.recent_traces.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide font-mono">
                    5. Appendix: Sample Execution Traces & Action Decoupling
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left font-mono text-[10px]">
                      <thead className="bg-slate-50 dark:bg-[#0c121e] text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2 px-3">Step</th>
                          <th className="py-2 px-3">Tool</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3">Fault</th>
                          <th className="py-2 px-3">Recovery Action</th>
                          <th className="py-2 px-3 text-right">Latency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                        {overallData.recent_traces.slice(0, 10).map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                            <td className="py-2 px-3">#{t.step_number}</td>
                            <td className="py-2 px-3 font-semibold">{t.tool_name}</td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-1.5 py-0.5 rounded ${
                                  t.status === 'success'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                }`}
                              >
                                {t.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-rose-500">{t.fault_category || 'none'}</td>
                            <td className="py-2 px-3 text-indigo-500">{t.recovery_action || 'none'}</td>
                            <td className="py-2 px-3 text-right">
                              {t.latency_ms !== null ? `${t.latency_ms}ms` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Bottom Actions Cluster */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <span className="text-[11px] font-mono text-slate-400">
                  TrustTrace Reliability Engine v0.1 • Empirical Benchmark
                </span>

                <div className="flex items-center space-x-2">
                  <a
                    href={api.reports.overallPdfUrl({ policy_id: policyFilter, scenario_id: scenarioFilter })}
                    download="trusttrace_overall_research_report.pdf"
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Vector PDF</span>
                  </a>

                  <button
                    onClick={handlePrint}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-2xs transition-colors"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No experimental data recorded yet"
              description="Execute benchmark experiments to generate an overall research report with vector PDF export."
              actionLabel="Create Experiment"
              onAction={() => navigate('/experiments/new')}
            />
          )}
        </div>
      )}

      {/* ─── TAB 2: SINGLE EXPERIMENT FOCUS ─────────────────────────────────── */}
      {reportScope === 'single' && (
        <div className="space-y-6">
          {/* Target Experiment Selector Bar */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
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
                  href={api.reports.experimentPdfUrl(selectedExpId)}
                  download={`experiment_${selectedExpId}_report.pdf`}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </a>
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
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 transition-colors shadow-xs"
                >
                  <FileText className="h-3.5 w-3.5 text-amber-500" />
                  <span>Markdown</span>
                </a>
              </div>
            )}
          </div>

          {/* Rendered Single Experiment Report Document */}
          {loadingSingle ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
              <span>Loading experiment telemetry...</span>
            </div>
          ) : experiment ? (
            <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#0b101d] border border-slate-200 dark:border-slate-800/80 space-y-6 text-slate-700 dark:text-slate-300 text-xs leading-relaxed font-sans shadow-sm print:shadow-none print:border-none print:p-0">
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
                  <span>Agent: {experiment.agent_type}</span>
                </div>
              </div>

              {/* Configuration */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide font-mono">
                  1. Experimental Configuration & Variables
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-[#090d16] p-4 rounded-xl border border-slate-200 dark:border-slate-800/60 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Policy:</span>
                    <strong className="text-indigo-600 dark:text-indigo-400">
                      {experiment.policy_id}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Scenario:</span>
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

              {/* Measured Metrics */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide font-mono">
                  2. Measured Evaluation Metrics
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
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-semibold">
                          Mean Latency
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                          {primaryMetric?.mean_latency_ms !== null &&
                          primaryMetric?.mean_latency_ms !== undefined
                            ? `${primaryMetric.mean_latency_ms.toFixed(0)} ms`
                            : 'N/A'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans text-xs">
                          Arithmetic mean of wall-clock duration across completed runs.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-semibold">
                          Average Retries
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                          {primaryMetric?.avg_retry_count !== null &&
                          primaryMetric?.avg_retry_count !== undefined
                            ? primaryMetric.avg_retry_count.toFixed(1)
                            : '0.0'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans text-xs">
                          Total tool retry calls consumed across all tasks.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Direct Evidence Panel Link */}
              <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    Want to inspect step-by-step audit logs, sanitized payloads, and root cause diagnosis?
                  </span>
                </div>
                <NavLink
                  to="/evidence"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                >
                  <span>Open Evidence Audit</span>
                  <ExternalLink className="h-3 w-3" />
                </NavLink>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No experiments found"
              description="Create and execute an experiment first to view single-experiment reports."
              actionLabel="New Experiment"
              onAction={() => navigate('/experiments/new')}
            />
          )}
        </div>
      )}
    </div>
  );
};
