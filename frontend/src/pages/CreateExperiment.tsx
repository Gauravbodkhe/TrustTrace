import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  Play,
  ShieldAlert,
  RotateCcw,
  Bot,
  AlertCircle,
  CheckSquare,
  Square,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import { Task, FaultScenario, RecoveryPolicy, ExperimentCreate } from '../types';

export const CreateExperiment: React.FC = () => {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [scenarios, setScenarios] = useState<FaultScenario[]>([]);
  const [policies, setPolicies] = useState<RecoveryPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [agentType, setAgentType] = useState<'mock' | 'gemini'>('mock');
  const [policyId, setPolicyId] = useState('policy_g_budget_aware');
  const [scenarioId, setScenarioId] = useState('transient_error_step1');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [taskSearch, setTaskSearch] = useState('');
  const [repetitions, setRepetitions] = useState<number>(1);
  const [seed, setSeed] = useState<number>(42);
  const [maxRetries, setMaxRetries] = useState<number>(3);
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(30);
  const [tokenBudget, setTokenBudget] = useState<string>('2000');
  const [costBudget, setCostBudget] = useState<string>('');

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
    if (selectedTaskIds.length === tasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(tasks.map((t) => t.id));
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (!taskSearch.trim()) return true;
    const q = taskSearch.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide an experiment name');
      return;
    }
    if (selectedTaskIds.length === 0) {
      setError('Please select at least one task to run');
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

  const selectedScenario = scenarios.find((s) => s.id === scenarioId);
  const selectedPolicy = policies.find((p) => p.id === policyId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400">
            <FlaskConical className="h-5 w-5" />
          </div>
          <span>Configure Reliability Experiment</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Set up a controlled experimental trial evaluating recovery policies against deterministic or
          stochastic tool faults.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2.5 shadow-2xs">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Experiment Metadata */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f1728] shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="h-5 w-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono font-bold text-xs">
              1
            </span>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Experiment Metadata & Hypothesis
            </h2>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Experiment Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Evaluation of Policy G on Transient Service Outages"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans shadow-2xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Hypothesis & Experimental Notes
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your research question, expected behaviors, or independent variables..."
                rows={2}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Section 2 & 3: Recovery Policy & Injected Fault */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recovery Policy Card */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f1728] shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="h-5 w-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono font-bold text-xs">
                2
              </span>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                <RotateCcw className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Recovery Strategy</span>
              </h2>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 font-mono">
                Select Policy
              </label>
              <select
                value={policyId}
                onChange={(e) => setPolicyId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 shadow-2xs"
              >
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {selectedPolicy && (
                <div className="mt-2.5 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800 leading-relaxed font-sans">
                  {selectedPolicy.description}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 font-mono">
                Agent Planning Provider
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setAgentType('mock')}
                  className={`p-3 rounded-lg border text-xs text-left transition-all ${
                    agentType === 'mock'
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold shadow-2xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090d16] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="font-mono text-xs text-indigo-700 dark:text-indigo-300">Deterministic Mock</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">100% reproducible baseline</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAgentType('gemini')}
                  className={`p-3 rounded-lg border text-xs text-left transition-all ${
                    agentType === 'gemini'
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold shadow-2xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090d16] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="font-mono text-xs flex items-center space-x-1 text-indigo-700 dark:text-indigo-300">
                    <span>Gemini Hybrid</span>
                    <Sparkles className="h-3 w-3 text-indigo-500" />
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">LLM planner + fallback</div>
                </button>
              </div>
            </div>
          </div>

          {/* Fault Scenario Card */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f1728] shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="h-5 w-5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center font-mono font-bold text-xs">
                3
              </span>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                <ShieldAlert className="h-4 w-4 text-rose-500" />
                <span>Injected Fault Scenario</span>
              </h2>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 font-mono">
                Select Fault Mode
              </label>
              <select
                value={scenarioId}
                onChange={(e) => setScenarioId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 shadow-2xs"
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>

              {selectedScenario && (
                <div className="mt-2.5 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5 font-sans">
                  <p className="leading-relaxed">{selectedScenario.description}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      Probability: {(selectedScenario.probability * 100).toFixed(0)}%
                    </span>
                    {selectedScenario.deterministic_step !== null && (
                      <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        Step: {selectedScenario.deterministic_step}
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 uppercase">
                      Severity: {selectedScenario.severity}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Task Selection */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f1728] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <span className="h-5 w-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono font-bold text-xs">
                4
              </span>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Benchmark Tasks Selection ({selectedTaskIds.length}/{tasks.length})
              </h2>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="pl-8 pr-3 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-sans w-36 sm:w-44"
                />
              </div>

              <button
                type="button"
                onClick={handleSelectAllTasks}
                className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {selectedTaskIds.length === tasks.length ? 'Clear Selection' : 'Select All'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
            {filteredTasks.map((t) => {
              const isSelected = selectedTaskIds.includes(t.id);
              return (
                <div
                  key={t.id}
                  onClick={() => handleToggleTask(t.id)}
                  className={`p-3 rounded-lg border cursor-pointer text-xs transition-all flex items-start space-x-2.5 ${
                    isSelected
                      ? 'border-indigo-500 dark:border-indigo-500/80 bg-indigo-50/50 dark:bg-indigo-950/20 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090d16] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
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
                    <div className="font-medium flex items-center justify-between">
                      <span className="truncate text-slate-900 dark:text-slate-200">{t.name}</span>
                      <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 ml-1">
                        {t.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {t.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 5: Budgets & Reproducibility Controls */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f1728] shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="h-5 w-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono font-bold text-xs">
              5
            </span>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Execution Budgets & Reproducibility Constraints
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                Repetitions (Trials)
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={repetitions}
                onChange={(e) => setRepetitions(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400">Repeated evaluations</span>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                Random Seed
              </label>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400">Deterministic seed</span>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                Max Retry Limit
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={maxRetries}
                onChange={(e) => setMaxRetries(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400">Retry loop ceiling</span>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                Timeout (seconds)
              </label>
              <input
                type="number"
                min={5}
                max={120}
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090d16] text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400">Execution time budget</span>
            </div>
          </div>
        </div>

        {/* Review & Launch Bar */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs font-mono text-slate-600 dark:text-slate-400 space-y-0.5">
            <div>
              Target: <strong className="text-indigo-600 dark:text-indigo-400">{policyId.replace('policy_', '')}</strong> |{' '}
              Fault: <strong className="text-rose-600 dark:text-rose-400">{scenarioId}</strong>
            </div>
            <div>
              Tasks: {selectedTaskIds.length} | Trials: {repetitions} | Estimated Runs: {selectedTaskIds.length * repetitions}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-medium text-white transition-all shadow-sm shadow-indigo-600/30"
            >
              <Play className={`h-4 w-4 ${submitting ? 'animate-spin' : ''}`} />
              <span>{submitting ? 'Launching Experiment...' : 'Create & Execute Experiment'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
