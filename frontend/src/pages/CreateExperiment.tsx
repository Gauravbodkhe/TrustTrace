import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  Play,
  ShieldAlert,
  RotateCcw,
  Bot,
  HelpCircle,
  AlertCircle,
  CheckSquare,
  Square,
  Sparkles,
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

        // Default: select first 3 tasks
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

      // Trigger run execution
      await api.experiments.run(experiment.id);

      // Navigate to details page
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
      <div className="border-b border-slate-800/80 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2.5">
          <FlaskConical className="h-5 w-5 text-indigo-400" />
          <span>Configure Reliability Experiment</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Set up a controlled experimental trial comparing recovery policies against deterministic or
          probabilistic tool faults.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Experiment Info */}
        <div className="p-5 rounded-xl bg-[#0f1524] border border-slate-800/80 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">1. Experiment Metadata</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Experiment Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Evaluation of Policy G on Transient Service Outages"
                className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Research Hypothesis / Notes
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe hypothesis, independent variables, or expected recovery behaviors..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>
          </div>
        </div>

        {/* Agent & Recovery Policy Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-[#0f1524] border border-slate-800/80 space-y-4">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <RotateCcw className="h-4 w-4 text-indigo-400" />
              <span>2. Recovery Policy</span>
            </h2>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-mono">
                Strategy Under Test
              </label>
              <select
                value={policyId}
                onChange={(e) => setPolicyId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {selectedPolicy && (
                <p className="mt-2 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded border border-slate-800 leading-relaxed font-sans">
                  {selectedPolicy.description}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-mono">Agent Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAgentType('mock')}
                  className={`p-2.5 rounded-lg border text-xs text-left transition-all ${
                    agentType === 'mock'
                      ? 'border-indigo-500 bg-indigo-950/30 text-indigo-200 font-semibold'
                      : 'border-slate-800 bg-[#090d16] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-mono text-[11px]">Deterministic Mock</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Zero API key, 100% reproducible</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAgentType('gemini')}
                  className={`p-2.5 rounded-lg border text-xs text-left transition-all ${
                    agentType === 'gemini'
                      ? 'border-indigo-500 bg-indigo-950/30 text-indigo-200 font-semibold'
                      : 'border-slate-800 bg-[#090d16] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-mono text-[11px] flex items-center space-x-1">
                    <span>Gemini Hybrid</span>
                    <Sparkles className="h-3 w-3 text-indigo-400" />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">LLM planner + fallback</div>
                </button>
              </div>
            </div>
          </div>

          {/* Fault Scenario Selection */}
          <div className="p-5 rounded-xl bg-[#0f1524] border border-slate-800/80 space-y-4">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              <span>3. Injected Fault Condition</span>
            </h2>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-mono">
                Simulated Fault Scenario
              </label>
              <select
                value={scenarioId}
                onChange={(e) => setScenarioId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>

              {selectedScenario && (
                <div className="mt-2 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded border border-slate-800 space-y-1">
                  <p className="leading-relaxed">{selectedScenario.description}</p>
                  <div className="flex items-center space-x-3 pt-1 text-[10px] font-mono text-slate-500">
                    <span>Probability: {(selectedScenario.probability * 100).toFixed(0)}%</span>
                    {selectedScenario.deterministic_step && (
                      <span>Step: {selectedScenario.deterministic_step}</span>
                    )}
                    <span>Severity: {selectedScenario.severity}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Task Selection */}
        <div className="p-5 rounded-xl bg-[#0f1524] border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">
                4. Benchmark Tasks Selection ({selectedTaskIds.length}/{tasks.length})
              </h2>
              <p className="text-xs text-slate-400">
                Select standardized benchmark tasks to execute across the experiment trials.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSelectAllTasks}
              className="text-xs font-mono text-indigo-400 hover:text-indigo-300"
            >
              {selectedTaskIds.length === tasks.length ? 'Deselect All' : 'Select All Tasks'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {tasks.map((t) => {
              const isSelected = selectedTaskIds.includes(t.id);
              return (
                <div
                  key={t.id}
                  onClick={() => handleToggleTask(t.id)}
                  className={`p-2.5 rounded-lg border cursor-pointer text-xs transition-all flex items-start space-x-2.5 ${
                    isSelected
                      ? 'border-indigo-500/60 bg-indigo-950/20 text-slate-200'
                      : 'border-slate-800 bg-[#090d16] text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="mt-0.5">
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-indigo-400" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium flex items-center justify-between">
                      <span className="truncate">{t.name}</span>
                      <span className="text-[10px] font-mono uppercase text-slate-500 px-1 rounded bg-slate-900 ml-1">
                        {t.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{t.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reproducibility & Budget Parameters */}
        <div className="p-5 rounded-xl bg-[#0f1524] border border-slate-800/80 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">
            5. Execution Budgets & Reproducibility Constraints
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Repetitions (Trials)
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={repetitions}
                onChange={(e) => setRepetitions(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#090d16] border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500">Repeated evaluations</span>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Random Seed</label>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#090d16] border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500">Reproducibility seed</span>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Max Retry Limit
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={maxRetries}
                onChange={(e) => setMaxRetries(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#090d16] border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500">Retry loop ceiling</span>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Timeout (seconds)
              </label>
              <input
                type="number"
                min={5}
                max={120}
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#090d16] border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500">Execution time budget</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-xs text-slate-300 font-mono transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-medium text-white transition-all shadow-md shadow-indigo-600/30"
          >
            <Play className={`h-4 w-4 ${submitting ? 'animate-spin' : ''}`} />
            <span>{submitting ? 'Launching Experiment...' : 'Create & Execute Experiment'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
