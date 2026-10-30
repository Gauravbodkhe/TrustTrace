import React, { useEffect, useState } from 'react';
import { useSearchParams, NavLink } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Clock,
  RotateCcw,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Code,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Play,
  ArrowRight,
  Filter,
  CheckCircle,
  HelpCircle,
  Wrench,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { Run, TraceStep, RecoveryDecision, ExperimentListItem, Task } from '../types';
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
  const [taskMap, setTaskMap] = useState<Record<string, Task>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failure'>('all');
  const [toolFilter, setToolFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedRawSteps, setExpandedRawSteps] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load experiments & tasks
  useEffect(() => {
    const loadInit = async () => {
      try {
        const [expList, taskList] = await Promise.all([
          api.experiments.list(),
          api.tasks.list().catch(() => []),
        ]);
        setExperiments(expList);

        const tMap: Record<string, Task> = {};
        taskList.forEach((t: Task) => {
          tMap[t.id] = t;
        });
        setTaskMap(tMap);

        if (expList.length > 0 && !selectedExperimentId) {
          setSelectedExperimentId(expList[0].id);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load initial data');
      }
    };
    loadInit();
  }, []);

  // When runIdParam changes or selectedExperimentId changes, sync
  useEffect(() => {
    if (!selectedExperimentId) return;
    const loadRuns = async () => {
      try {
        const runList = await api.experiments.listRuns(selectedExperimentId);
        setRuns(runList);
        if (runList.length > 0) {
          const found = runList.find((r) => r.id === runIdParam);
          setSelectedRunId(found ? found.id : runList[0].id);
        } else {
          setSelectedRunId('');
          setCurrentRun(null);
          setTraces([]);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load runs for selected experiment');
      }
    };
    loadRuns();
  }, [selectedExperimentId]);

  // Load trace steps for the selected run
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

        // Auto-select experiment dropdown if not matched
        if (runData && runData.experiment_id && runData.experiment_id !== selectedExperimentId) {
          setSelectedExperimentId(runData.experiment_id);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load trace steps');
      } finally {
        setLoading(false);
      }
    };
    loadTraceData();
  }, [selectedRunId]);

  const toggleRaw = (id: string) => {
    setExpandedRawSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter traces
  const filteredTraces = traces.filter((t) => {
    if (statusFilter === 'success' && t.status !== 'success') return false;
    if (statusFilter === 'failure' && t.status === 'success') return false;
    if (toolFilter !== 'all' && t.tool_name !== toolFilter) return false;
    if (categoryFilter !== 'all') {
      const cat = t.fault_category || t.diagnosis_category || 'none';
      if (cat !== categoryFilter) return false;
    }
    return true;
  });

  const uniqueTools = Array.from(new Set(traces.map((t) => t.tool_name)));
  const uniqueCategories = Array.from(
    new Set(
      traces
        .map((t) => t.fault_category || t.diagnosis_category)
        .filter((c): c is string => Boolean(c))
    )
  );

  const currentTask = currentRun ? taskMap[currentRun.task_id] : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400">
            <Activity className="h-5 w-5" />
          </div>
          <span>Step-by-Step Activity</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Follow the AI agent's exact tool calls, test problems, and error fixes in simple language.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2.5 shadow-2xs">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Run Selector Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f1728] shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">
            1. Choose a Test
          </label>
          <select
            value={selectedExperimentId}
            onChange={(e) => {
              setSelectedExperimentId(e.target.value);
            }}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 shadow-2xs"
          >
            {experiments.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.name} ({new Date(exp.created_at).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">
            2. Choose a Task Run
          </label>
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            disabled={runs.length === 0}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 shadow-2xs disabled:opacity-50"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                Run #{r.run_number}: {taskMap[r.task_id]?.name || r.task_id} — [{r.outcome || r.status}]
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Run Overview Banner */}
      {currentRun && (
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b101d] flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={currentRun.outcome || currentRun.status} />
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Task: <strong className="text-slate-900 dark:text-slate-100">{currentTask?.name || currentRun.task_id}</strong>
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Method: <strong className="text-indigo-600 dark:text-indigo-400">{currentRun.policy_id.replace('policy_', '')}</strong>
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Test Problem: <strong className="text-rose-600 dark:text-rose-400">{currentRun.scenario_id}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
            <span>Time Taken: {currentRun.duration_ms ?? 0}ms</span>
            <span>Retries: {currentRun.retry_count}</span>
            <span>Seed: {currentRun.seed}</span>
          </div>
        </div>
      )}

      {/* Simple Filters Bar */}
      <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1728] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400 font-medium">
          <Filter className="h-3.5 w-3.5 text-indigo-500" />
          <span>Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Results</option>
            <option value="success">Completed Successfully</option>
            <option value="failure">Errors & Problems</option>
          </select>

          {/* Tool filter */}
          {uniqueTools.length > 0 && (
            <select
              value={toolFilter}
              onChange={(e) => setToolFilter(e.target.value)}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Tools ({uniqueTools.length})</option>
              {uniqueTools.map((tool) => (
                <option key={tool} value={tool}>
                  {tool}
                </option>
              ))}
            </select>
          )}

          {/* Category filter */}
          {uniqueCategories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Fault Categories</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace('_', ' ')}
                </option>
              ))}
            </select>
          )}

          {(statusFilter !== 'all' || toolFilter !== 'all' || categoryFilter !== 'all') && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setToolFilter('all');
                setCategoryFilter('all');
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline px-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Vertical Timeline */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 font-mono text-xs space-y-2">
          <Activity className="h-6 w-6 animate-spin mx-auto text-indigo-600 dark:text-indigo-400" />
          <span>Tracing step-by-step agent execution...</span>
        </div>
      ) : !currentRun ? (
        <EmptyState
          title="No Run Selected"
          description="Select an experiment and a run from the dropdowns above to inspect its execution timeline."
        />
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {/* Timeline Event 1: Task Started */}
          <div className="relative group">
            {/* Dot */}
            <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 border-2 border-blue-500 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs shadow-xs">
              <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
            </div>

            {/* Content Card */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1728] shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  Task Started
                </span>
                <span className="text-[11px] text-slate-400">
                  Run #{currentRun.run_number}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {currentTask?.description || `Beginning multi-step plan for task "${currentRun.task_id}".`}
              </p>
            </div>
          </div>

          {/* Chronological Steps */}
          {filteredTraces.map((step, idx) => {
            const hasFault = step.fault_injected || step.status !== 'success';
            const stepDecisions = decisions.filter((d) => d.trace_id === step.id);
            const isRawExpanded = !!expandedRawSteps[step.id];

            return (
              <div key={step.id} className="space-y-4">
                {/* Event: Tool Called */}
                <div className="relative group">
                  <div
                    className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs shadow-xs ${
                      hasFault
                        ? 'bg-rose-100 dark:bg-rose-950 border-rose-500 text-rose-600 dark:text-rose-400'
                        : 'bg-emerald-100 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    <Wrench className="h-3 w-3" />
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1728] shadow-xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                          Step {step.step_number}: Tool Used
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold border border-slate-200 dark:border-slate-700">
                          {step.tool_name}
                        </span>
                        {step.retry_number > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-mono">
                            Retry #{step.retry_number}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 text-slate-400 text-xs font-mono">
                        {step.latency_ms !== null && <span>{step.latency_ms}ms</span>}
                        <StatusBadge status={step.status} size="sm" />
                      </div>
                    </div>

                    {/* Plain Language Input Summary */}
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-medium text-slate-500 dark:text-slate-400 mr-1.5">
                        What was sent (Input):
                      </span>
                      <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                        {Object.keys(step.input_data || {}).length > 0
                          ? JSON.stringify(step.input_data)
                          : '(No arguments required)'}
                      </code>
                    </div>

                    {/* Output summary if nominal */}
                    {!hasFault && step.output_data && (
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 mr-1.5">
                          ✓ Result:
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          Completed successfully. Good data received.
                        </span>
                      </div>
                    )}

                    {/* Fault Detected Event Card */}
                    {hasFault && (
                      <div className="mt-3 p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-1.5 text-xs">
                        <div className="font-semibold text-rose-700 dark:text-rose-300 flex items-center space-x-1.5">
                          <XCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />
                          <span>Problem Detected: {step.fault_category || 'Tool Problem'}</span>
                        </div>
                        <p className="text-rose-600 dark:text-rose-400 text-[11px] leading-relaxed">
                          The tool call did not complete normally. A simulated test problem was triggered at this step.
                        </p>
                      </div>
                    )}

                    {/* Failure Diagnosed Event Card */}
                    {step.diagnosis_category && (
                      <div className="p-3.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 space-y-1.5 text-xs">
                        <div className="font-semibold text-indigo-700 dark:text-indigo-300 flex items-center space-x-1.5">
                          <Sparkles className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                          <span>Problem Diagnosed: {step.diagnosis_category.replace('_', ' ')}</span>
                        </div>
                        <p className="text-indigo-600 dark:text-indigo-400 text-[11px] leading-relaxed">
                          The AI detected the problem as a <strong>{step.diagnosis_category.replace('_', ' ')}</strong>.
                        </p>
                      </div>
                    )}

                    {/* Recovery Attempted Event Card */}
                    {stepDecisions.length > 0 && (
                      <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-1.5 text-xs">
                        <div className="font-semibold text-amber-700 dark:text-amber-300 flex items-center space-x-1.5">
                          <RotateCcw className="h-4 w-4 text-amber-500 flex-shrink-0" />
                          <span>Fix Attempted: {stepDecisions[0].decision.toUpperCase()}</span>
                        </div>
                        <p className="text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                          {stepDecisions[0].reason}
                        </p>
                      </div>
                    )}

                    {/* Expandable Raw Data Toggle */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => toggleRaw(step.id)}
                        className="text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center space-x-1"
                      >
                        <Code className="h-3 w-3" />
                        <span>{isRawExpanded ? 'Hide Raw Details' : 'Show Raw Details (JSON)'}</span>
                        {isRawExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                    </div>

                    {/* Raw Data Accordion */}
                    {isRawExpanded && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[11px] font-mono">
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#06080e] border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between text-slate-500 mb-1">
                            <span>Input Payload</span>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(JSON.stringify(step.input_data, null, 2), `in-${step.id}`)
                              }
                              className="hover:text-slate-800 dark:hover:text-slate-200"
                            >
                              {copiedId === `in-${step.id}` ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          <pre className="overflow-x-auto text-slate-800 dark:text-slate-200 max-h-36">
                            {JSON.stringify(step.input_data, null, 2)}
                          </pre>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#06080e] border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between text-slate-500 mb-1">
                            <span>Output Payload</span>
                            {step.output_data && (
                              <button
                                type="button"
                                onClick={() =>
                                  copyToClipboard(
                                    JSON.stringify(step.output_data, null, 2),
                                    `out-${step.id}`
                                  )
                                }
                                className="hover:text-slate-800 dark:hover:text-slate-200"
                              >
                                {copiedId === `out-${step.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>
                          <pre className="overflow-x-auto text-slate-800 dark:text-slate-200 max-h-36">
                            {step.output_data
                              ? JSON.stringify(step.output_data, null, 2)
                              : '// No output payload recorded or call failed'}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Timeline Event Final: Task Finished */}
          <div className="relative group">
            <div
              className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs shadow-xs ${
                currentRun.outcome === 'success'
                  ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-100 dark:bg-rose-950 border-rose-500 text-rose-600 dark:text-rose-400'
              }`}
            >
              {currentRun.outcome === 'success' ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1728] shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {currentRun.outcome === 'success' ? 'Task Finished Successfully' : 'Task Stopped with Error'}
                </span>
                <StatusBadge status={currentRun.outcome || currentRun.status} size="sm" />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {currentRun.outcome === 'success'
                  ? `Task executed to completion in ${currentRun.duration_ms ?? 0}ms with ${currentRun.retry_count} retries.`
                  : `Task stopped with ${currentRun.retry_count} retries. ${currentRun.error_message || 'An error stopped the task.'}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
