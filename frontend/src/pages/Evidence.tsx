import React, { useEffect, useState } from 'react';
import { useSearchParams, NavLink } from 'react-router-dom';
import {
  FileCheck2,
  ShieldAlert,
  RotateCcw,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Code,
  ArrowRight,
  Filter,
  Lock,
  Search,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../services/api';
import { EvidenceSummary, RunEvidence, ExperimentListItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { VoiceMicButton } from '../voice/VoiceMicButton';

export const Evidence: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const runIdParam = searchParams.get('runId');

  const [evidenceList, setEvidenceList] = useState<EvidenceSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>(runIdParam || '');
  const [runEvidence, setRunEvidence] = useState<RunEvidence | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState('all');
  const [selectedOutcome, setSelectedOutcome] = useState('all');
  const [activeTab, setActiveTab] = useState<'observed' | 'metrics' | 'diagnosis' | 'ai_explanation' | 'missing'>('observed');
  const [expandedTracePayloads, setExpandedTracePayloads] = useState<Record<string, boolean>>({});

  // 1. Load evidence list
  useEffect(() => {
    const fetchList = async () => {
      try {
        setLoadingList(true);
        setError(null);
        const res = await api.evidence.list({
          policy_id: selectedPolicy,
          outcome: selectedOutcome,
          limit: 100,
        });
        setEvidenceList(res.evidence_items);

        if (res.evidence_items.length > 0) {
          const matched = res.evidence_items.find((item) => item.run_id === runIdParam);
          setSelectedRunId(matched ? matched.run_id : res.evidence_items[0].run_id);
        } else {
          setSelectedRunId('');
          setRunEvidence(null);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load evidence list');
      } finally {
        setLoadingList(false);
      }
    };
    fetchList();
  }, [selectedPolicy, selectedOutcome]);

  // 2. Load run evidence when selected
  useEffect(() => {
    if (!selectedRunId) return;
    setSearchParams({ runId: selectedRunId });

    const fetchEvidence = async () => {
      try {
        setLoadingEvidence(true);
        setError(null);
        const data = await api.evidence.get(selectedRunId);
        setRunEvidence(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch detailed evidence for run');
      } finally {
        setLoadingEvidence(false);
      }
    };
    fetchEvidence();
  }, [selectedRunId]);

  const togglePayload = (id: string) => {
    setExpandedTracePayloads((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredItems = evidenceList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.task_id.toLowerCase().includes(q) ||
      item.policy_id.toLowerCase().includes(q) ||
      item.scenario_id.toLowerCase().includes(q) ||
      item.run_id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <span>Proof and Results</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Clear proof of what actually happened, separated into facts, numbers, rule checks, and AI explanations.
          </p>
        </div>

        {/* Secret Redaction Badge */}
        <div className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs">
          <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Passwords & Private Data Hidden</span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Left Run Selector, Right Evidence Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Runs List */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1728] shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Tests Run ({filteredItems.length})
            </h2>
            <span className="text-[11px] text-slate-400">Select run to inspect</span>
          </div>

          {/* Search with Voice Mic */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tests, tasks, methods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              <VoiceMicButton onTranscript={(txt) => setSearchQuery(txt)} />
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <select
              value={selectedPolicy}
              onChange={(e) => setSelectedPolicy(e.target.value)}
              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Methods</option>
              <option value="policy_a_baseline_stop">Policy A</option>
              <option value="policy_b_bounded_retry">Policy B</option>
              <option value="policy_c_validation_retry">Policy C</option>
              <option value="policy_d_fallback">Policy D</option>
              <option value="policy_e_safe_stop">Policy E</option>
              <option value="policy_f_clarification">Policy F</option>
              <option value="policy_g_budget_aware">Policy G</option>
            </select>

            <select
              value={selectedOutcome}
              onChange={(e) => setSelectedOutcome(e.target.value)}
              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Outcomes</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="unsafe">Unsafe</option>
            </select>
          </div>

          {/* Runs Scroll List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {loadingList ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading runs...</div>
            ) : filteredItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No runs matching filter.</div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = item.run_id === selectedRunId;
                return (
                  <div
                    key={item.run_id}
                    onClick={() => setSelectedRunId(item.run_id)}
                    className={`p-3 rounded-lg border cursor-pointer text-xs transition-all ${
                      isSelected
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#090d16]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[140px]">
                        {item.task_id}
                      </span>
                      <StatusBadge status={item.outcome} size="sm" />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                      <span>{item.policy_id.replace('policy_', '')}</span>
                      <span>{item.total_steps} steps</span>
                    </div>

                    {item.fault_injected && (
                      <div className="mt-1.5 text-[10px] text-rose-600 dark:text-rose-400 font-mono">
                        Fault: {item.fault_category || 'Injected'}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Evidence Package for Selected Run */}
        <div className="lg:col-span-2 space-y-4">
          {!runEvidence ? (
            <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1728] text-center">
              <EmptyState
                title="Select a run to view evidence"
                description="Choose an evaluated run from the list on the left to inspect observed facts, calculated metrics, diagnoses, and AI explanations."
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Evidence Run Header Banner */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1728] shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Run Evidence: {runEvidence.task_id}
                      </h2>
                      <StatusBadge status={runEvidence.calculated_metrics.terminal_outcome} />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Experiment: <span className="text-slate-800 dark:text-slate-200 font-medium">{runEvidence.experiment_name}</span> (ID: {runEvidence.experiment_id.slice(0, 8)})
                    </p>
                  </div>

                  <NavLink
                    to={`/traces?runId=${runEvidence.run_id}`}
                    className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-medium border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex items-center space-x-1"
                  >
                    <span>View Timeline Trace</span>
                    <ArrowRight className="h-3 w-3" />
                  </NavLink>
                </div>

                {/* Evidence Metadata Badges */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs font-mono">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    Policy: <strong className="text-indigo-600 dark:text-indigo-400">{runEvidence.policy_id.replace('policy_', '')}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    Fault: <strong className="text-rose-600 dark:text-rose-400">{runEvidence.scenario_id}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    Duration: {runEvidence.calculated_metrics.wall_clock_duration_ms ?? 0}ms
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    Retries: {runEvidence.calculated_metrics.retries_used} / {runEvidence.calculated_metrics.max_retries_configured}
                  </span>
                </div>
              </div>

              {/* Categorization Tabs (The 4 Distinct Evidential Layers) */}
              <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 gap-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab('observed')}
                  className={`px-3.5 py-2 rounded-t-lg transition-colors border-b-2 ${
                    activeTab === 'observed'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold bg-slate-50 dark:bg-slate-900/60'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  1. What Really Happened ({runEvidence.observed_evidence.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('metrics')}
                  className={`px-3.5 py-2 rounded-t-lg transition-colors border-b-2 ${
                    activeTab === 'metrics'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold bg-slate-50 dark:bg-slate-900/60'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  2. Calculated Numbers
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('diagnosis')}
                  className={`px-3.5 py-2 rounded-t-lg transition-colors border-b-2 ${
                    activeTab === 'diagnosis'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold bg-slate-50 dark:bg-slate-900/60'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  3. Rule-Based Problem Detection
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('ai_explanation')}
                  className={`px-3.5 py-2 rounded-t-lg transition-colors border-b-2 ${
                    activeTab === 'ai_explanation'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold bg-slate-50 dark:bg-slate-900/60'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  4. AI Notes
                </button>

                {runEvidence.missing_evidence.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('missing')}
                    className={`px-3.5 py-2 rounded-t-lg transition-colors border-b-2 ${
                      activeTab === 'missing'
                        ? 'border-amber-600 text-amber-600 dark:text-amber-400 font-semibold bg-slate-50 dark:bg-slate-900/60'
                        : 'border-transparent text-amber-600/80 hover:text-amber-700'
                    }`}
                  >
                    Missing Information ({runEvidence.missing_evidence.length})
                  </button>
                )}
              </div>

              {/* TAB 1: OBSERVED EVIDENCE */}
              {activeTab === 'observed' && (
                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1728] shadow-xs space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                      <span>What Really Happened (Observed Facts)</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        Safe Data
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Real tool calls, time taken, and sanitized inputs directly from execution logs.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {runEvidence.observed_evidence.map((step) => {
                      const isExpanded = !!expandedTracePayloads[step.trace_id];
                      return (
                        <div
                          key={step.trace_id}
                          className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#090d16] text-xs space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                Step #{step.step_number}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                                {step.tool_name}
                              </span>
                              <StatusBadge status={step.status} size="sm" />
                            </div>

                            <span className="text-slate-400 font-mono text-[11px]">
                              Time Taken: {step.latency_ms ?? 0}ms
                            </span>
                          </div>

                          {step.fault_injected && (
                            <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px] font-mono">
                              <strong>Problem Injected:</strong> {step.fault_category}
                            </div>
                          )}

                          {step.recovery_action && (
                            <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-[11px] font-mono">
                              <strong>Action Taken to Fix:</strong> {step.recovery_action}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => togglePayload(step.trace_id)}
                            className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 pt-1"
                          >
                            <Code className="h-3 w-3" />
                            <span>{isExpanded ? 'Hide Data Payloads' : 'Inspect Private Payloads (Safe to View)'}</span>
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>

                          {isExpanded && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
                              <div className="p-2 rounded bg-white dark:bg-[#04060a] border border-slate-200 dark:border-slate-800">
                                <span className="text-slate-400 font-sans block mb-1">What was sent (Input)</span>
                                <pre className="overflow-x-auto text-slate-800 dark:text-slate-200">
                                  {JSON.stringify(step.sanitized_inputs, null, 2)}
                                </pre>
                              </div>
                              <div className="p-2 rounded bg-white dark:bg-[#04060a] border border-slate-200 dark:border-slate-800">
                                <span className="text-slate-400 font-sans block mb-1">What came back (Output)</span>
                                <pre className="overflow-x-auto text-slate-800 dark:text-slate-200">
                                  {step.sanitized_outputs ? JSON.stringify(step.sanitized_outputs, null, 2) : '(No output)'}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: CALCULATED METRICS */}
              {activeTab === 'metrics' && (
                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1728] shadow-xs space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Calculated Numbers
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Direct mathematical calculations computed from step logs and clock times.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">Execution Steps</span>
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                        {runEvidence.calculated_metrics.total_execution_steps} steps
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">Time Taken</span>
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                        {runEvidence.calculated_metrics.wall_clock_duration_ms ?? 0}ms
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">Retries Used</span>
                      <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                        {runEvidence.calculated_metrics.retry_budget_consumed_pct}%
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {runEvidence.calculated_metrics.retries_used} of {runEvidence.calculated_metrics.max_retries_configured} retries
                      </span>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">Tokens Used</span>
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                        {runEvidence.calculated_metrics.token_usage !== null
                          ? `${runEvidence.calculated_metrics.token_usage} tokens`
                          : 'null'}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">External Cost</span>
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                        {runEvidence.calculated_metrics.actual_cost_usd !== null
                          ? `$${runEvidence.calculated_metrics.actual_cost_usd}`
                          : 'null (simulated)'}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">Final Status</span>
                      <div className="mt-1">
                        <StatusBadge status={runEvidence.calculated_metrics.terminal_outcome} size="sm" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: RULE-BASED DIAGNOSIS */}
              {activeTab === 'diagnosis' && (
                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1728] shadow-xs space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Rule-Based Problem Detection & Fixes
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      What problem happened vs what the AI detected and decided to do.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">Test Problem Injected</span>
                      <div className="font-mono font-bold text-rose-600 dark:text-rose-400 mt-1">
                        {runEvidence.rule_based_diagnosis.ground_truth_fault}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">Problem AI Detected</span>
                      <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                        {runEvidence.rule_based_diagnosis.diagnosed_fault}
                      </div>
                    </div>
                  </div>

                  {/* Decision Chain */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Decisions Made ({runEvidence.rule_based_diagnosis.recovery_decisions.length})
                    </span>

                    {runEvidence.rule_based_diagnosis.recovery_decisions.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No recovery decisions were required or dispatched.</p>
                    ) : (
                      runEvidence.rule_based_diagnosis.recovery_decisions.map((dec) => (
                        <div
                          key={dec.decision_id}
                          className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090d16] text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono uppercase">
                              Action: {dec.action}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Method: {dec.policy_id.replace('policy_', '')}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300">{dec.reason}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: AI EXPLANATION */}
              {activeTab === 'ai_explanation' && (
                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1728] shadow-xs space-y-4">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      AI-Generated Notes & Explanation
                    </h3>
                  </div>

                  {/* Disclaimer banner */}
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
                    <p className="text-[11px] leading-relaxed">
                      {runEvidence.ai_explanation.disclaimer}
                    </p>
                  </div>

                  <div className="space-y-3 text-xs leading-relaxed">
                    <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-1">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">Summary</span>
                      <p className="text-slate-700 dark:text-slate-300">{runEvidence.ai_explanation.summary}</p>
                    </div>

                    <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-1">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">What Caused the Problem</span>
                      <p className="text-slate-700 dark:text-slate-300">{runEvidence.ai_explanation.root_cause_analysis}</p>
                    </div>

                    <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-1">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">How Well the AI Recovered</span>
                      <p className="text-slate-700 dark:text-slate-300">{runEvidence.ai_explanation.recovery_assessment}</p>
                    </div>

                    {/* Citations */}
                    <div className="space-y-1.5 pt-1">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        Supporting Facts & Traces
                      </span>
                      <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {runEvidence.ai_explanation.supporting_evidence_citations.map((cite, idx) => (
                          <li key={idx}>{cite}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: MISSING EVIDENCE */}
              {activeTab === 'missing' && (
                <div className="p-5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs space-y-3">
                  <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                    What Was Not Measured
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    To maintain complete honesty, TrustTrace clearly lists what metrics were not measured:
                  </p>

                  <div className="space-y-2">
                    {runEvidence.missing_evidence.map((m, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-white dark:bg-[#090d16] text-xs">
                        <strong className="text-amber-800 dark:text-amber-400 font-mono">{m.field}:</strong>{' '}
                        <span className="text-slate-700 dark:text-slate-300">{m.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
