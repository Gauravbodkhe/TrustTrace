import React, { useEffect, useState } from 'react';
import { useSearchParams, NavLink } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Clock,
  RotateCcw,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Code,
  CornerDownRight,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { Run, TraceStep, RecoveryDecision, ExperimentListItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

export const TraceExplorer: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const runIdParam = searchParams.get('runId');

  const [experiments, setExperiments] = useState<ExperimentListItem[]>([]);
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>('');
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>(runIdParam || '');
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [traces, setTraces] = useState<TraceStep[]>([]);
  const [decisions, setDecisions] = useState<RecoveryDecision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterTool, setFilterTool] = useState<string>('all');
  const [filterFaultOnly, setFilterFaultOnly] = useState<boolean>(false);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load experiments
  useEffect(() => {
    const loadExperiments = async () => {
      try {
        const expList = await api.experiments.list();
        setExperiments(expList);
        if (expList.length > 0 && !selectedExperimentId) {
          setSelectedExperimentId(expList[0].id);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load experiments');
      }
    };
    loadExperiments();
  }, []);

  // Load runs
  useEffect(() => {
    if (!selectedExperimentId) return;
    const loadRuns = async () => {
      try {
        const runList = await api.experiments.listRuns(selectedExperimentId);
        setRuns(runList);
        if (runList.length > 0) {
          // If param matches one of the runs, keep it; otherwise pick first
          const found = runList.find((r) => r.id === runIdParam);
          setSelectedRunId(found ? found.id : runList[0].id);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load runs');
      }
    };
    loadRuns();
  }, [selectedExperimentId]);

  // Load traces
  useEffect(() => {
    if (!selectedRunId) return;
    setSearchParams({ runId: selectedRunId });

    const loadTraceData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [runData, traceList, decisionList] = await Promise.all([
          api.runs.get(selectedRunId),
          api.runs.traces(selectedRunId),
          api.runs.decisions(selectedRunId),
        ]);
        setCurrentRun(runData);
        setTraces(traceList);
        setDecisions(decisionList);

        // Auto-expand faulted or non-success steps
        const initExpanded: Record<string, boolean> = {};
        traceList.forEach((t) => {
          if (t.fault_injected || t.status !== 'success') {
            initExpanded[t.id] = true;
          }
        });
        setExpandedSteps(initExpanded);
      } catch (err: any) {
        setError(err?.message || 'Failed to load trace telemetry');
      } finally {
        setLoading(false);
      }
    };
    loadTraceData();
  }, [selectedRunId]);

  const toggleExpand = (stepId: string) => {
    setExpandedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredTraces = traces.filter((t) => {
    if (filterFaultOnly && !t.fault_injected && t.status === 'success') return false;
    if (filterTool !== 'all' && t.tool_name !== filterTool) return false;
    return true;
  });

  const uniqueTools = Array.from(new Set(traces.map((t) => t.tool_name)));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400">
            <Activity className="h-5 w-5" />
          </div>
          <span>Execution Trace Explorer</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Chronological inspection of agent tool calls, injected fault events, rule-based diagnoses,
          and recovery decisions.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2.5 shadow-2xs">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Selector Controls Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f1728] shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
        <div>
          <label className="block text-slate-600 dark:text-slate-400 mb-1 font-sans font-medium">
            Experiment
          </label>
          <select
            value={selectedExperimentId}
            onChange={(e) => {
              setSelectedExperimentId(e.target.value);
              setSelectedRunId('');
            }}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-sans shadow-2xs"
          >
            {experiments.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.name} ({exp.id.slice(0, 6)}...)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-600 dark:text-slate-400 mb-1 font-sans font-medium">
            Execution Run
          </label>
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            disabled={runs.length === 0}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-sans shadow-2xs disabled:opacity-50"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                Run #{r.run_number} — {r.task_id} [{r.outcome || r.status}]
              </option>
            ))}
          </select>
        </div>

        {/* Filter Controls */}
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-sans font-medium">
              Filter Tool
            </label>
            <select
              value={filterTool}
              onChange={(e) => setFilterTool(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-sans shadow-2xs"
            >
              <option value="all">All Tools ({traces.length})</option>
              {uniqueTools.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 pb-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterFaultOnly}
              onChange={(e) => setFilterFaultOnly(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0"
            />
            <span className="text-[11px] font-sans font-medium">Faults Only</span>
          </label>
        </div>
      </div>

      {/* Run Summary Card */}
      {currentRun && (
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b101d] flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-2xs">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={currentRun.outcome || currentRun.status} />
            <span className="text-slate-600 dark:text-slate-400 font-sans">
              Task: <strong className="text-slate-900 dark:text-slate-100 font-mono">{currentRun.task_id}</strong>
            </span>
            <span className="text-slate-600 dark:text-slate-400 font-sans">
              Policy: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{currentRun.policy_id.replace('policy_', '')}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-4 text-slate-500 dark:text-slate-400 text-[11px]">
            <span>Duration: {currentRun.duration_ms ?? 0}ms</span>
            <span>Retries: {currentRun.retry_count}</span>
            <span>Seed: {currentRun.seed}</span>
          </div>
        </div>
      )}

      {/* Timeline Steps */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">
            <Activity className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600 dark:text-indigo-400" />
            <span>Loading trace telemetry...</span>
          </div>
        ) : filteredTraces.length === 0 ? (
          <EmptyState
            title="No Trace Steps Found"
            description="No execution steps match your filter criteria or no runs were recorded."
          />
        ) : (
          filteredTraces.map((step) => {
            const isExpanded = !!expandedSteps[step.id];
            const hasFault = step.fault_injected;
            const stepDecisions = decisions.filter((d) => d.trace_id === step.id);

            return (
              <div
                key={step.id}
                className={`rounded-xl border transition-all overflow-hidden shadow-2xs ${
                  hasFault
                    ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-[#14101e]'
                    : step.status !== 'success'
                    ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-[#161214]'
                    : 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f1728]'
                }`}
              >
                {/* Step Header Accordion Toggle */}
                <div
                  onClick={() => toggleExpand(step.id)}
                  className="px-5 py-3.5 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <button className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      Step #{step.step_number}
                      {step.retry_number > 0 && (
                        <span className="text-amber-600 dark:text-amber-400 ml-1">
                          (retry {step.retry_number})
                        </span>
                      )}
                    </span>

                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      {step.tool_name}
                    </span>

                    <StatusBadge status={step.status} size="sm" />

                    {/* Fault pill */}
                    {hasFault && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/50 text-[10px] font-mono font-medium">
                        <ShieldAlert className="h-3 w-3" />
                        <span>Fault: {step.fault_category}</span>
                      </span>
                    )}

                    {/* Diagnosis pill */}
                    {step.diagnosis_category && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/40 text-[10px] font-mono">
                        <span>Diagnosis: {step.diagnosis_category}</span>
                      </span>
                    )}

                    {/* Recovery Action pill */}
                    {step.recovery_action && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/40 text-[10px] font-mono">
                        <span>Action: {step.recovery_action}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-mono text-slate-500 dark:text-slate-400 flex-shrink-0">
                    {step.latency_ms !== null && <span>{step.latency_ms}ms</span>}
                    {step.token_usage !== null && <span>{step.token_usage} tokens</span>}
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#090d16] space-y-4">
                    {/* Recovery Decisions Log */}
                    {stepDecisions.length > 0 && (
                      <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-2 shadow-2xs">
                        <div className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center space-x-1.5 uppercase tracking-wider">
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Recovery Policy Engine Decision</span>
                        </div>
                        {stepDecisions.map((d) => (
                          <div key={d.id} className="text-xs space-y-1 text-slate-700 dark:text-slate-300 font-sans">
                            <p>
                              <strong>Action Decision:</strong>{' '}
                              <span className="font-mono text-indigo-600 dark:text-indigo-300 uppercase font-semibold">
                                {d.decision}
                              </span>
                            </p>
                            <p className="text-slate-600 dark:text-slate-400 text-xs">
                              <strong>Decision Reason:</strong> {d.reason}
                            </p>
                            {d.budget_remaining && (
                              <p className="text-[11px] font-mono text-slate-500">
                                Budget remaining: {JSON.stringify(d.budget_remaining)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inputs & Outputs Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Inputs */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400">
                          <div className="flex items-center space-x-1">
                            <Code className="h-3.5 w-3.5" />
                            <span>Tool Inputs (Redacted)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(JSON.stringify(step.input_data, null, 2), `in-${step.id}`)
                            }
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded flex items-center space-x-1"
                          >
                            {copiedId === `in-${step.id}` ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        <pre className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#06080e] text-[11px] font-mono text-slate-800 dark:text-slate-200 overflow-x-auto max-h-48 shadow-2xs">
                          {JSON.stringify(step.input_data, null, 2)}
                        </pre>
                      </div>

                      {/* Outputs */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400">
                          <div className="flex items-center space-x-1">
                            <CornerDownRight className="h-3.5 w-3.5" />
                            <span>Tool Output</span>
                          </div>
                          {step.output_data && (
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(JSON.stringify(step.output_data, null, 2), `out-${step.id}`)
                              }
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded flex items-center space-x-1"
                            >
                              {copiedId === `out-${step.id}` ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                        <pre className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#06080e] text-[11px] font-mono text-slate-800 dark:text-slate-200 overflow-x-auto max-h-48 shadow-2xs">
                          {step.output_data
                            ? JSON.stringify(step.output_data, null, 2)
                            : '// No output payload recorded or call failed'}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
