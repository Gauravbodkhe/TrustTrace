import React, { useEffect, useState } from 'react';
import {
  GitCompare,
  RotateCcw,
  Trophy,
  Play,
  HelpCircle,
  Clock,
  Activity,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { api } from '../services/api';
import { PolicyComparisonResponse } from '../types';
import { useTheme } from '../context/ThemeContext';

const POLICY_DESCRIPTIONS: Record<string, string> = {
  policy_a_no_recovery: 'Immediately halt and fail upon the first tool error.',
  policy_b_immediate_retry: 'Retry the failed tool call immediately without waiting.',
  policy_c_exponential_backoff: 'Retry with progressive backoff delays (1s, 2s, 4s).',
  policy_d_fallback_tool: 'Switch to alternative secondary tools or cached response data.',
  policy_e_llm_correction: 'Analyze the error message and attempt prompt self-correction.',
  policy_f_human_escalation: 'Pause execution and request human supervisor intervention.',
  policy_g_budget_aware: 'Dynamically choose the optimal recovery action based on error type and budget.',
};

export const PolicyComparison: React.FC = () => {
  const { chartTheme, resolvedTheme } = useTheme();
  const [data, setData] = useState<PolicyComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningBatch, setRunningBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchComparison = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.metrics.comparison();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load policy comparison data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, []);

  // Run Comparison Experiment: tests all 7 policies on a standard task under transient error
  const handleRunComparisonBatch = async () => {
    try {
      setRunningBatch(true);
      setError(null);
      const policiesToTest = [
        'policy_a_no_recovery',
        'policy_b_immediate_retry',
        'policy_c_exponential_backoff',
        'policy_d_fallback_tool',
        'policy_e_llm_correction',
        'policy_f_human_escalation',
        'policy_g_budget_aware',
      ];

      for (let i = 0; i < policiesToTest.length; i++) {
        const pol = policiesToTest[i];
        setBatchProgress(`Running policy ${i + 1} of 7: ${pol.replace('policy_', '')}...`);
        const exp = await api.experiments.create({
          name: `Direct Comparison: ${pol.replace('policy_', '').toUpperCase()}`,
          description: `Automated comparative run of ${pol} under transient error.`,
          agent_type: 'mock',
          policy_id: pol,
          scenario_id: 'transient_error_step1',
          task_ids: ['task_expense_policy', 'task_order_lookup'],
          repetitions: 1,
          seed: 42,
          max_retries: 3,
          timeout_seconds: 30,
          token_budget: 2000,
          cost_budget_usd: null,
        });
        await api.experiments.run(exp.id);
      }

      setBatchProgress('Finalizing comparative telemetry...');
      await fetchComparison();
    } catch (err: any) {
      setError(err?.message || 'Failed to run full policy comparison batch');
    } finally {
      setRunningBatch(false);
      setBatchProgress(null);
    }
  };

  const chartData =
    data?.policies?.map((p) => {
      const shortName = p.policy_name.includes(':')
        ? p.policy_name.split(':')[0].replace('Policy ', 'P-')
        : p.policy_id.replace('policy_', '');
      return {
        name: shortName,
        fullName: p.policy_name,
        taskSuccess: p.task_success_rate !== null ? Math.round(p.task_success_rate * 100) : 0,
        recoverySuccess:
          p.recovery_success_rate !== null ? Math.round(p.recovery_success_rate * 100) : 0,
        samples: p.sample_size,
      };
    }) || [];

  // Determine best performing policy
  const evaluated = (data?.policies || []).filter((p) => p.sample_size > 0 && p.task_success_rate !== null);
  const bestPolicyId =
    evaluated.length > 0
      ? [...evaluated].sort(
          (a, b) =>
            ((b.task_success_rate || 0) + (b.recovery_success_rate || 0)) -
            ((a.task_success_rate || 0) + (a.recovery_success_rate || 0))
        )[0].policy_id
      : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400">
              <GitCompare className="h-5 w-5" />
            </div>
            <span>Policy Comparison</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Compare reliability, recovery success, execution time, and retry costs across all 7 recovery policies.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleRunComparisonBatch}
            disabled={runningBatch}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-xs shadow-indigo-600/30 disabled:opacity-50"
            title="Execute test runs for all 7 recovery policies to produce an apples-to-apples comparison"
          >
            <Play className={`h-3.5 w-3.5 ${runningBatch ? 'animate-spin' : ''}`} />
            <span>{runningBatch ? 'Running 7 Policies...' : 'Run Comparison Experiment'}</span>
          </button>

          <button
            onClick={fetchComparison}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors shadow-2xs"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {batchProgress && (
        <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-800 dark:text-indigo-300 text-xs flex items-center space-x-2.5 shadow-2xs animate-pulse">
          <Play className="h-4 w-4 animate-spin text-indigo-600" />
          <span>{batchProgress}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Simple Side-by-Side Bar Chart */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#0f1728] border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Success & Recovery Rate by Strategy
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Side-by-side comparison of overall task completion rate vs. failure recovery rate
            </p>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Hover bars to see exact percentages and sample sizes
          </span>
        </div>

        <div className="h-72 w-full pt-2">
          {chartData.some((p) => p.samples > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -15, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke={chartTheme.axis}
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  stroke={chartTheme.axis}
                  fontSize={11}
                  tickLine={false}
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    color: chartTheme.tooltipText,
                    fontSize: '12px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: any, name: any) => [`${value}%`, name]}
                  labelFormatter={(label: any) => {
                    const item = chartData.find((p) => p.name === label);
                    return item ? `${item.fullName} (${item.samples} runs tested)` : label;
                  }}
                  cursor={{ fill: resolvedTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: '11px',
                    paddingTop: '10px',
                    color: chartTheme.legendText,
                  }}
                />
                <Bar
                  dataKey="taskSuccess"
                  name="Task Success Rate %"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={45}
                />
                <Bar
                  dataKey="recoverySuccess"
                  name="Recovery Success Rate %"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={45}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No policy comparison runs yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Click "Run Comparison Experiment" above to automatically evaluate all 7 policies under realistic tool faults.
              </p>
              <button
                onClick={handleRunComparisonBatch}
                disabled={runningBatch}
                className="mt-3 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500"
              >
                {runningBatch ? 'Running...' : 'Run Comparison Experiment Now'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Clean Comparison Table */}
      <div className="rounded-xl bg-white dark:bg-[#0f1728] border border-slate-200 dark:border-slate-800/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Policy Comparison Matrix
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluated policies, sample sizes, and empirical recovery metrics
            </p>
          </div>
          <span className="text-xs text-slate-400">7 Policies Total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#0b101c] text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800/80 font-medium">
              <tr>
                <th className="py-3 px-5">Policy Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Tasks Tested</th>
                <th className="py-3 px-4">Success Rate</th>
                <th className="py-3 px-4">Recovery Rate</th>
                <th className="py-3 px-4">Avg Retries</th>
                <th className="py-3 px-4">Avg Time</th>
                <th className="py-3 px-5">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {data?.policies?.map((p) => {
                const isBest = p.policy_id === bestPolicyId;
                const hasData = p.sample_size > 0;
                const desc = POLICY_DESCRIPTIONS[p.policy_id] || '';

                return (
                  <tr
                    key={p.policy_id}
                    className={`transition-colors ${
                      isBest
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-3.5 px-5 font-sans">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {p.policy_name}
                        </span>
                        {isBest && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            <Trophy className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Best Performer</span>
                          </span>
                        )}
                        {p.policy_id === 'policy_g_budget_aware' && !isBest && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            Proposed
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 mt-0.5">{p.policy_id}</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs">
                      <span className="line-clamp-2">{desc}</span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {p.sample_size} runs
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      {hasData && p.task_success_rate !== null ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {(p.task_success_rate * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      {hasData && p.recovery_success_rate !== null ? (
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {(p.recovery_success_rate * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {hasData && p.avg_retry_count !== null ? `${p.avg_retry_count} retries` : '—'}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {hasData && p.mean_latency_ms !== null ? `${Math.round(p.mean_latency_ms)}ms` : '—'}
                    </td>

                    <td className="py-3.5 px-5 font-mono text-slate-500 text-[11px]">
                      {p.estimated_cost_usd !== null ? `$${p.estimated_cost_usd.toFixed(4)}` : 'Free (mock)'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plain-Language Metric Explanations */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#0f1728] border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-3">
        <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-semibold text-xs">
          <HelpCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span>Understanding the Benchmark Metrics</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center space-x-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Success Rate</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              "Did the agent finish the overall task?"
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Percentage of tasks that reached a successful conclusion without halting or exceeding retry limits.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center space-x-1.5">
              <RotateCcw className="h-3.5 w-3.5 text-indigo-500" />
              <span>Recovery Rate</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              "When a tool failed, did the policy fix it?"
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Measures how effectively the strategy rescued execution when injected tool errors occurred.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center space-x-1.5">
              <Activity className="h-3.5 w-3.5 text-amber-500" />
              <span>Avg Retries</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              "How many extra attempts did it take?"
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              A high retry count with low recovery rate indicates wasteful loops; lower retries save tokens.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center space-x-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>Avg Time</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              "How long did it take to complete or fail?"
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Total wall-clock duration including tool execution, diagnosis, backoff delay, and retries.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
