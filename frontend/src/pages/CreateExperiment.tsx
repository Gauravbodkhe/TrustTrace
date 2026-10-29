import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  Play,
  RotateCcw,
  Bot,
  Sparkles,
  CheckCircle2,
  CheckSquare,
  Square,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  Sliders,
  Check,
  Zap,
} from 'lucide-react';
import { api } from '../services/api';
import { Task, FaultScenario, RecoveryPolicy, ExperimentCreate } from '../types';

interface PolicyCardInfo {
  id: string;
  code: string;
  name: string;
  description: string;
  isProposed?: boolean;
}

const POLICIES_INFO: PolicyCardInfo[] = [
  {
    id: 'policy_a_no_recovery',
    code: 'Policy A',
    name: 'No Recovery',
    description: 'The agent immediately fails when any tool encounters an error.',
  },
  {
    id: 'policy_b_immediate_retry',
    code: 'Policy B',
    name: 'Immediate Retry',
    description: 'Retries the failed tool call immediately without waiting.',
  },
  {
    id: 'policy_c_exponential_backoff',
    code: 'Policy C',
    name: 'Exponential Backoff',
    description: 'Retries with increasing wait times (e.g. 1s, 2s, 4s) to handle temporary errors.',
  },
  {
    id: 'policy_d_fallback_tool',
    code: 'Policy D',
    name: 'Fallback Tool',
    description: 'Switches to an alternative tool or cached data when the primary tool fails.',
  },
  {
    id: 'policy_e_llm_correction',
    code: 'Policy E',
    name: 'LLM Self-Correction',
    description: 'The agent analyzes the error message and attempts to fix its arguments.',
  },
  {
    id: 'policy_f_human_escalation',
    code: 'Policy F',
    name: 'Human Escalation',
    description: 'Pauses execution and requests human intervention or clarification.',
  },
  {
    id: 'policy_g_budget_aware',
    code: 'Policy G',
    name: 'Budget-Aware Multi-Strategy',
    description: 'Dynamically chooses the best recovery action based on error type and remaining retry budget.',
    isProposed: true,
  },
];

interface ScenarioCategoryGroup {
  id: string;
  name: string;
  description: string;
  scenarios: FaultScenario[];
}

export const CreateExperiment: React.FC = () => {
  const navigate = useNavigate();

  // Wizard state: 1 to 6
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Data prerequisites
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scenarios, setScenarios] = useState<FaultScenario[]>([]);
  const [policies, setPolicies] = useState<RecoveryPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  // Step 1: Details
  const [name, setName] = useState('Benchmark Trial: Reliability & Fault Recovery');
  const [description, setDescription] = useState(
    'Testing if exponential backoff recovers from rate limits faster than immediate retry'
  );
  const [agentType, setAgentType] = useState<'mock' | 'gemini'>('mock');

  // Step 2: Recovery Policy
  const [policyId, setPolicyId] = useState('policy_g_budget_aware');

  // Step 3: Failure Scenario
  const [scenarioId, setScenarioId] = useState('transient_error_step1');
  const [expandedTechId, setExpandedTechId] = useState<string | null>(null);

  // Step 4: Tasks Selection
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [taskSearch, setTaskSearch] = useState('');

  // Step 5: Configure Execution
  const [repetitions, setRepetitions] = useState<number>(1);
  const [seed, setSeed] = useState<number>(42);
  const [maxRetries, setMaxRetries] = useState<number>(3);
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(30);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [tokenBudget, setTokenBudget] = useState<string>('2000');
  const [costBudget, setCostBudget] = useState<string>('');
  const [concurrencyLimit, setConcurrencyLimit] = useState<number>(1);

  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        setLoading(true);
        const [taskList, scenarioList, policyList] = await Promise.all([
          api.tasks.list(),
          api.scenarios.list(),
          api.scenarios.listPolicies(),
        ]);
        setTasks(taskList);
        setScenarios(scenarioList);
        setPolicies(policyList);

        if (taskList.length > 0) {
          setSelectedTaskIds(taskList.slice(0, 3).map((t) => t.id));
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load configuration prerequisites');
      } finally {
        setLoading(false);
      }
    };
    loadPrerequisites();
  }, []);

  const handleToggleTask = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSelectAllTasks = () => {
    setSelectedTaskIds(tasks.map((t) => t.id));
  };

  const handleClearTaskSelection = () => {
    setSelectedTaskIds([]);
  };

  const handleNextStep = () => {
    setError(null);
    if (currentStep === 1) {
      if (!name.trim()) {
        setError('Please enter an experiment name to proceed.');
        return;
      }
    }
    if (currentStep === 4) {
      if (selectedTaskIds.length === 0) {
        setError('Please select at least one task to test.');
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 6));
  };

  const handlePrevStep = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setError(null);

    if (!name.trim()) {
      setError('Please provide an experiment name');
      setCurrentStep(1);
      return;
    }
    if (selectedTaskIds.length === 0) {
      setError('Please select at least one task');
      setCurrentStep(4);
      return;
    }

    try {
      setSubmitting(true);
      const payload: ExperimentCreate = {
        name: name.trim(),
        description: description.trim(),
        agent_type: agentType,
        policy_id: policyId,
        scenario_id: scenarioId,
        task_ids: selectedTaskIds,
        repetitions: Number(repetitions) || 1,
        seed: Number(seed) || 42,
        max_retries: Number(maxRetries) || 3,
        timeout_seconds: Number(timeoutSeconds) || 30,
        token_budget: tokenBudget ? parseInt(tokenBudget) : null,
        cost_budget_usd: costBudget ? parseFloat(costBudget) : null,
      };

      const experiment = await api.experiments.create(payload);
      await api.experiments.run(experiment.id);
      navigate(`/experiments/${experiment.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create and run experiment');
      setSubmitting(false);
    }
  };

  // Group scenarios into user-friendly categories
  const categorizeScenario = (s: FaultScenario): string => {
    const cat = s.category.toLowerCase();
    const id = s.id.toLowerCase();
    if (cat === 'none' || id === 'no_fault') return 'no_failure';
    if (cat === 'tool_unavailable' || cat === 'invalid_arguments' || cat === 'schema_validation' || cat === 'permission') {
      return 'tool_problems';
    }
    if (cat === 'malformed_json' || cat === 'missing_fields' || cat === 'empty_response') {
      return 'invalid_responses';
    }
    if (cat === 'rate_limit' || cat === 'stale_data' || cat === 'context_overflow') {
      return 'data_problems';
    }
    return 'temporary_errors'; // transient_error, timeout, etc.
  };

  const scenarioCategories: ScenarioCategoryGroup[] = [
    {
      id: 'no_failure',
      name: 'No Failure (Baseline)',
      description: 'Tools always work normally without any injected faults.',
      scenarios: scenarios.filter((s) => categorizeScenario(s) === 'no_failure'),
    },
    {
      id: 'temporary_errors',
      name: 'Temporary Service Errors',
      description: 'Network timeouts, 503 service unavailable, and transient connection blips.',
      scenarios: scenarios.filter((s) => categorizeScenario(s) === 'temporary_errors'),
    },
    {
      id: 'tool_problems',
      name: 'Tool Problems',
      description: 'Tool missing, permission denied, or schema argument validation failures.',
      scenarios: scenarios.filter((s) => categorizeScenario(s) === 'tool_problems'),
    },
    {
      id: 'invalid_responses',
      name: 'Invalid Responses',
      description: 'Malformed JSON, missing required fields, or empty responses returned by tools.',
      scenarios: scenarios.filter((s) => categorizeScenario(s) === 'invalid_responses'),
    },
    {
      id: 'data_problems',
      name: 'Data Problems',
      description: 'Rate limit quotas exceeded, stale cached responses, or context overflow.',
      scenarios: scenarios.filter((s) => categorizeScenario(s) === 'data_problems'),
    },
  ];

  const selectedScenario = scenarios.find((s) => s.id === scenarioId);
  const selectedPolicy = POLICIES_INFO.find((p) => p.id === policyId) || {
    id: policyId,
    code: 'Custom Policy',
    name: policyId,
    description: '',
  };

  const filteredTasks = tasks.filter((t) => {
    if (!taskSearch.trim()) return true;
    const q = taskSearch.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    );
  });

  const estimatedTotalRuns = selectedTaskIds.length * repetitions;

  const stepTitles = [
    'Details',
    'Recovery Strategy',
    'Failure Scenario',
    'Benchmark Tasks',
    'Execution Settings',
    'Review & Run',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400">
            <FlaskConical className="h-5 w-5" />
          </div>
          <span>New Experiment</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure and execute a reliability benchmark to evaluate agent resilience against tool failures.
        </p>
      </div>

      {/* Wizard Progress Indicator */}
      <div className="bg-white dark:bg-[#0f1728] border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
            Step {currentStep} of 6: {stepTitles[currentStep - 1]}
          </span>
          <span className="text-slate-400 text-[11px]">
            {Math.round((currentStep / 6) * 100)}% Completed
          </span>
        </div>

        {/* Progress bar line */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-3">
          <div
            className="bg-indigo-600 dark:bg-indigo-500 h-full transition-all duration-300"
            style={{ width: `${(currentStep / 6) * 100}%` }}
          />
        </div>

        {/* Clickable Step Pills */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {stepTitles.map((title, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;
            return (
              <button
                key={title}
                type="button"
                onClick={() => {
                  if (stepNum <= currentStep) setCurrentStep(stepNum);
                }}
                disabled={stepNum > currentStep}
                className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-lg text-left text-[11px] transition-all ${
                  isCurrent
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800'
                    : isCompleted
                    ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer'
                    : 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCurrent
                      ? 'bg-indigo-600 text-white'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  {isCompleted ? '✓' : stepNum}
                </span>
                <span className="truncate">{title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2.5 shadow-2xs">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Contents */}
      <div className="bg-white dark:bg-[#0f1728] border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 shadow-xs min-h-[380px]">
        {/* STEP 1: Experiment Details */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Step 1: Experiment Details
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Give your test a meaningful name and choose the agent planning provider.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Experiment Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Evaluation of Budget-Aware Recovery under Transient Outages"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Hypothesis / Research Notes (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Testing if exponential backoff recovers from rate limits faster than immediate retry"
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Example: "Testing whether fallback caching yields lower recovery latency compared to prompt self-correction."
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Agent Planning Provider
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setAgentType('mock')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      agentType === 'mock'
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          Simulated Agent (Deterministic, Fast)
                        </span>
                      </div>
                      {agentType === 'mock' && (
                        <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      100% free, instant, and deterministic — recommended for evaluating recovery policies and testing failure behaviors reliably.
                    </p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                      Recommended for Benchmarks
                    </span>
                  </div>

                  <div
                    onClick={() => setAgentType('gemini')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      agentType === 'gemini'
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          Gemini Flash (Real LLM)
                        </span>
                      </div>
                      {agentType === 'gemini' && (
                        <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      Sends real prompts to Google Gemini Flash. Requires an API key in your environment and evaluates actual LLM behavior.
                    </p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Requires GEMINI_API_KEY
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Choose Recovery Strategy */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Step 2: Choose Recovery Strategy
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select how the AI agent should react when a tool execution fails.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {POLICIES_INFO.map((policy) => {
                const isSelected = policyId === policy.id;
                return (
                  <div
                    key={policy.id}
                    onClick={() => setPolicyId(policy.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between ${
                      isSelected
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#090d16]'
                    }`}
                  >
                    <div className="space-y-1 pr-3 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {policy.code}: {policy.name}
                        </span>
                        {policy.isProposed && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-2xs">
                            ★ Proposed Strategy
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        "{policy.description}"
                      </p>
                    </div>

                    <div className="pt-0.5 flex-shrink-0">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Choose Failure Scenario */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Step 3: Choose Failure Scenario
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select an injected fault mode to simulate realistic tool and environment failures.
              </p>
            </div>

            <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1">
              {scenarioCategories.map((cat) => {
                if (cat.scenarios.length === 0) return null;
                return (
                  <div key={cat.id} className="space-y-2">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-1">
                      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {cat.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {cat.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {cat.scenarios.map((scen) => {
                        const isSelected = scenarioId === scen.id;
                        const isExpanded = expandedTechId === scen.id;
                        return (
                          <div
                            key={scen.id}
                            className={`p-3 rounded-lg border transition-all text-xs ${
                              isSelected
                                ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-2xs'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#090d16]'
                            }`}
                          >
                            <div
                              onClick={() => setScenarioId(scen.id)}
                              className="cursor-pointer flex items-start justify-between"
                            >
                              <div className="flex-1 pr-2">
                                <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                                  <span>{scen.name}</span>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                                  {scen.description}
                                </p>
                              </div>

                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 flex-shrink-0 ${
                                  isSelected
                                    ? 'border-indigo-600 bg-indigo-600 text-white'
                                    : 'border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {isSelected && <Check className="h-2.5 w-2.5" />}
                              </div>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[10px]">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {scen.deterministic_step !== null
                                  ? `Fails at step ${scen.deterministic_step}`
                                  : 'Probabilistic failure'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                Probability: {Math.round(scen.probability * 100)}%
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                                Severity: {scen.severity}
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedTechId(isExpanded ? null : scen.id);
                                }}
                                className="ml-auto text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-0.5"
                              >
                                <span>{isExpanded ? 'Hide Technical' : 'Technical Details'}</span>
                                {isExpanded ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </button>
                            </div>

                            {/* Expandable Technical Details */}
                            {isExpanded && (
                              <div className="mt-2 p-2 rounded bg-slate-50 dark:bg-slate-900 text-[11px] font-mono text-slate-600 dark:text-slate-400 space-y-0.5 border border-slate-200 dark:border-slate-800">
                                <div>Technical ID: {scen.id}</div>
                                <div>Category: {scen.category}</div>
                                <div>Failure delay: {scen.failure_delay_ms}ms</div>
                                <div>Seed: {scen.seed ?? 'Dynamic'}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: Select Benchmark Tasks */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Step 4: Select Benchmark Tasks
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Choose which standardized multi-step agent tasks to include in this evaluation.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSelectAllTasks}
                  className="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleClearTaskSelection}
                  className="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* Task count & Search */}
            <div className="flex items-center justify-between text-xs py-1">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                Selected: {selectedTaskIds.length} of {tasks.length} tasks
              </span>

              <div className="relative w-48">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter tasks..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Tasks List */}
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {filteredTasks.map((t) => {
                const isSelected = selectedTaskIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => handleToggleTask(t.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start space-x-3 text-xs ${
                      isSelected
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#090d16]'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400 dark:text-slate-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {t.name}
                        </span>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {t.category.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {t.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 5: Configure Execution */}
        {currentStep === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Step 5: Configure Execution
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Set repetition counts, random seed, retry limits, and optional resource budgets.
              </p>
            </div>

            {/* Core settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Number of Trials
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                  How many times to repeat each benchmark task for statistical significance.
                </p>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={repetitions}
                  onChange={(e) => setRepetitions(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Random Seed
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                  Controls determinism and reproducibility of tool mock responses and faults.
                </p>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Max Retries
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                  Maximum number of retry attempts allowed before a task run is terminated.
                </p>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Timeout per Task (seconds)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                  Maximum execution wall-clock time permitted before aborting.
                </p>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={timeoutSeconds}
                  onChange={(e) => setTimeoutSeconds(parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Collapsible Advanced Settings */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="flex items-center space-x-2">
                  <Sliders className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Advanced Settings (Token Budget & Limits)</span>
                </span>
                {showAdvancedSettings ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showAdvancedSettings && (
                <div className="p-4 space-y-4 bg-white dark:bg-[#0f1728] text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Token Budget Limit
                      </label>
                      <input
                        type="text"
                        value={tokenBudget}
                        onChange={(e) => setTokenBudget(e.target.value)}
                        placeholder="2000"
                        className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-[10px] text-slate-400">
                        Max LLM tokens allowed per task run
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Cost Budget ($ USD)
                      </label>
                      <input
                        type="text"
                        value={costBudget}
                        onChange={(e) => setCostBudget(e.target.value)}
                        placeholder="Optional (e.g. 0.05)"
                        className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-[10px] text-slate-400">
                        Max expenditure ceiling before hard termination
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Concurrency Limit
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={4}
                        value={concurrencyLimit}
                        onChange={(e) => setConcurrencyLimit(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-[10px] text-slate-400">
                        Parallel worker thread count
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 6: Review & Run */}
        {currentStep === 6 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Step 6: Review & Run Experiment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review your trial parameters before triggering agent execution.
              </p>
            </div>

            {/* Summary card */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Experiment Name</span>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{name}</div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Agent Provider</span>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {agentType === 'mock' ? 'Simulated Agent (Deterministic)' : 'Gemini Flash (Real LLM)'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Recovery Strategy</span>
                  <div className="font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {selectedPolicy.code}: {selectedPolicy.name}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    "{selectedPolicy.description}"
                  </p>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Fault Scenario</span>
                  <div className="font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                    {selectedScenario?.name || scenarioId}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedScenario?.description}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Benchmark Tasks</span>
                  <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {selectedTaskIds.length} tasks
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Trials per Task</span>
                  <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {repetitions}x
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Max Retries / Timeout</span>
                  <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {maxRetries} retries / {timeoutSeconds}s
                  </div>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <span className="text-indigo-700 dark:text-indigo-300 font-semibold text-[11px]">
                    Estimated Total Runs
                  </span>
                  <div className="font-mono font-bold text-indigo-800 dark:text-indigo-200 text-sm mt-0.5">
                    {estimatedTotalRuns} runs
                  </div>
                </div>
              </div>
            </div>

            {/* In-flight execution progress indication */}
            {submitting && (
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 flex items-center space-x-3 text-xs text-indigo-800 dark:text-indigo-200">
                <Play className="h-4 w-4 animate-spin text-indigo-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Executing experiment benchmark runs...</p>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                    Simulating tool failures, recording execution traces, and calculating metrics. You will be redirected automatically upon completion.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-2">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={submitting}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
          >
            Cancel
          </button>
        )}

        {currentStep < 6 ? (
          <button
            type="button"
            onClick={handleNextStep}
            className="flex items-center space-x-1.5 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-all shadow-xs"
          >
            <span>Continue to Step {currentStep + 1}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              disabled={submitting}
              className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50"
            >
              Back to Edit
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-sm shadow-indigo-600/30 disabled:opacity-50"
            >
              <Play className={`h-4 w-4 ${submitting ? 'animate-spin' : ''}`} />
              <span>{submitting ? 'Running Experiment...' : 'Run Experiment'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
