import React, { useEffect, useState } from 'react';
import { useSearchParams, NavLink } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  ShieldAlert,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Code,
  CornerDownRight,
  Bot,
  HelpCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { Run, TraceStep, RecoveryDecision, ExperimentListItem } from '../types';

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

  // Filter state
  const [filterTool, setFilterTool] = useState<string>('all');
  const [filterFaultOnly, setFilterFaultOnly] = useState<boolean>(false);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  // 1. Initial load of experiments
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

  // 2. Load runs when experiment changes
  useEffect(() => {
    if (!selectedExperimentId) return;
    const loadRuns = async () => {
      try {
        const runList = await api.experiments.listRuns(selectedExperimentId);
        setRuns(runList);
        if (runList.length > 0 && !selectedRunId) {
          setSelectedRunId(runList[0].id);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load runs');
      }
    };
    loadRuns();
  }, [selectedExperimentId]);

  // 3. Load traces when runId changes
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

        // Auto-expand fault-injected steps
        const initExpanded: Record<string, boolean> = {};
        traceList.forEach((t) => {
          if (t.fault_injected || t.status !== 'success') {
            initExpanded[t.id] = true;
          }
        });
        setExpandedSteps(initExpanded);
      } catch (err: any) {
        setError(err?.message || 'Failed to load execution trace for this run');
      } finally {
        setLoading(false);
      }
    };
    loadTraceData();
  }, [selectedRunId]);

  const toggleExpand = (stepId: string) => {
    setExpandedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const filteredTraces = traces.filter((t) => {
    if (filterFaultOnly && !t.fault_injected && t.status === 'success') return false;
    if (filterTool !== 'all' && t.tool_name !== filterTool) return false;
    return true;
  });

  const uniqueTools = Array.from(new Set(traces.map((t) => t.tool_name)));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-800/80 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2.5">
          <Activity className="h-5 w-5 text-indigo-400" />
          <span>Execution Trace Explorer</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Chronological inspection of agent plan steps, injected faults, rule-based diagnoses, and
          policy recovery actions.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Selectors Bar */}
      <div className="p-4 rounded-xl bg-[#0f1524] border border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
        <div>
          <label className="block text-slate-400 mb-1">Experiment</label>
          <select
            value={selectedExperimentId}
            onChange={(e) => {
              setSelectedExperimentId(e.target.value);
              setSelectedRunId('');
            }}
            className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 font-sans"
          >
            {experiments.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.name} ({exp.id.slice(0, 6)}...)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-400 mb-1">Execution Run</label>
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            disabled={runs.length === 0}
            className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 font-sans disabled:opacity-50"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                Run #{r.run_number} — {r.task_id} [{r.outcome || r.status}]
              </option>
            ))}
          </select>
        </div>

        {/* Filters */}
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <label className="block text-slate-400 mb-1">Filter Tool</label>
            <select
              value={filterTool}
              onChange={(e) => setFilterTool(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 font-sans"
            >
              <option value="all">All Tools ({traces.length})</option>
              {uniqueTools.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center space-x-2 text-slate-300 pb-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterFaultOnly}
              onChange={(e) => setFilterFaultOnly(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
            />
            <span className="text-[11px]">Faults Only</span>
          </label>
        </div>
      </div>

      {/* Run Summary Banner */}
      {currentRun && (
        <div className="p-4 rounded-xl bg-[#0b101d] border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-3">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                currentRun.outcome === 'success'
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                  : currentRun.outcome === 'failure'
                  ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                  : currentRun.outcome === 'unsafe'
                  ? 'bg-red-950/80 text-red-300 border border-red-700/50'
                  : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
              }`}
            >
              Outcome: {currentRun.outcome || currentRun.status}
            </span>
            <span className="text-slate-400">
              Task: <strong className="text-slate-200">{currentRun.task_id}</strong>
            </span>
            <span className="text-slate-400">
              Policy: <strong className="text-indigo-400">{currentRun.policy_id.replace('policy_', '')}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-4 text-slate-400 text-[11px]">
            <span>Duration: {currentRun.duration_ms ?? 0}ms</span>
            <span>Retries: {currentRun.retry_count}</span>
            <span>Seed: {currentRun.seed}</span>
          </div>
        </div>
      )}

      {/* Chronological Timeline */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">
            <Activity className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-400" />
            <span>Loading trace events...</span>
          </div>
        ) : filteredTraces.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">
            <span>No execution steps found matching the current filter.</span>
          </div>
        ) : (
          filteredTraces.map((step, idx) => {
            const isExpanded = !!expandedSteps[step.id];
            const hasFault = step.fault_injected;
            const stepDecisions = decisions.filter((d) => d.trace_id === step.id);

            return (
              <div
                key={step.id}
                className={`rounded-xl border transition-all overflow-hidden ${
                  hasFault
                    ? 'border-rose-800/60 bg-[#14101e]'
                    : step.status !== 'success'
                    ? 'border-amber-800/60 bg-[#161214]'
                    : 'border-slate-800/80 bg-[#0f1524]'
                }`}
              >
                {/* Step Header Bar */}
                <div
                  onClick={() => toggleExpand(step.id)}
                  className="px-5 py-3.5 flex items-center justify-between cursor-pointer select-none hover:bg-slate-800/20"
                >
                  <div className="flex items-center space-x-3">
                    <button className="text-slate-500 hover:text-slate-300">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    <span className="font-mono text-xs text-slate-500">
                      Step #{step.step_number}
                      {step.retry_number > 0 && (
                        <span className="text-amber-400 ml-1">(retry {step.retry_number})</span>
                      )}
                    </span>

                    <span className="font-mono text-xs font-semibold text-slate-200">
                      {step.tool_name}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                        step.status === 'success'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                          : step.status === 'timeout'
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                      }`}
                    >
                      {step.status}
                    </span>

                    {/* Injected Fault Badge */}
                    {hasFault && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-900/40 text-rose-300 border border-rose-700/50 text-[10px] font-mono">
                        <ShieldAlert className="h-3 w-3" />
                        <span>Fault: {step.fault_category}</span>
                      </span>
                    )}

                    {/* Diagnosis Result */}
                    {step.diagnosis_category && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-indigo-950/50 text-indigo-300 border border-indigo-800/40 text-[10px] font-mono">
                        <span>Diagnosis: {step.diagnosis_category}</span>
                      </span>
                    )}

                    {/* Recovery Action */}
                    {step.recovery_action && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-950/50 text-amber-300 border border-amber-800/40 text-[10px] font-mono">
                        <span>Action: {step.recovery_action}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-mono text-slate-500">
                    {step.latency_ms !== null && <span>{step.latency_ms}ms</span>}
                    {step.token_usage !== null && <span>{step.token_usage} tokens</span>}
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className="px-5 py-4 border-t border-slate-800/60 bg-[#090d16] space-y-4">
                    {/* Recovery Decision Log */}
                    {stepDecisions.length > 0 && (
                      <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1.5">
                        <div className="text-[11px] font-mono font-semibold text-amber-400 flex items-center space-x-1.5">
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Recovery Policy Engine Decision</span>
                        </div>
                        {stepDecisions.map((d) => (
                          <div key={d.id} className="text-xs space-y-1 text-slate-300 font-sans">
                            <p>
                              <strong>Decision:</strong>{' '}
                              <span className="font-mono text-indigo-300 uppercase">{d.decision}</span>
                            </p>
                            <p className="text-slate-400 text-xs">
                              <strong>Reason:</strong> {d.reason}
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

                    {/* Input & Output Grids */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Inputs */}
                      <div className="space-y-1">
                        <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
                          <Code className="h-3.5 w-3.5" />
                          <span>Tool Inputs (Redacted)</span>
                        </div>
                        <pre className="p-3 rounded-lg bg-[#06080e] border border-slate-900 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
                          {JSON.stringify(step.input_data, null, 2)}
                        </pre>
                      </div>

                      {/* Outputs */}
                      <div className="space-y-1">
                        <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
                          <CornerDownRight className="h-3.5 w-3.5" />
                          <span>Tool Output (Recorded)</span>
                        </div>
                        <pre className="p-3 rounded-lg bg-[#06080e] border border-slate-900 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
                          {step.output_data
                            ? JSON.stringify(step.output_data, null, 2)
                            : '// No output recorded or execution failed'}
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
