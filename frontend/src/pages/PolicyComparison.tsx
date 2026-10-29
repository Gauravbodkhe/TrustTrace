import React, { useEffect, useState } from 'react';
import {
  GitCompare,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Info,
  TrendingUp,
  BarChart3,
  Award,
  Zap,
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
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { PolicyComparisonResponse } from '../types';
import { useTheme } from '../context/ThemeContext';
import { EmptyState } from '../components/EmptyState';

export const PolicyComparison: React.FC = () => {
  const { chartTheme } = useTheme();
  const [data, setData] = useState<PolicyComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
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

  const chartData =
    data?.policies
      ?.filter((p) => p.sample_size > 0)
      ?.map((p) => ({
        name: p.policy_name.replace('Policy ', '').split(':')[0],
        fullName: p.policy_name,
        taskSuccess: p.task_success_rate !== null ? Math.round(p.task_success_rate * 100) : 0,
        recoverySuccess:
          p.recovery_success_rate !== null ? Math.round(p.recovery_success_rate * 100) : 0,
        unsafeRate: p.unsafe_recovery_rate !== null ? Math.round(p.unsafe_recovery_rate * 100) : 0,
        latency: p.mean_latency_ms || 0,
        retries: p.avg_retry_count || 0,
        samples: p.sample_size,
      })) || [];

  // Identify best policies for highlight cards
  const validPolicies = (data?.policies || []).filter((p) => p.sample_size > 0);
  const highestSuccessPolicy = validPolicies.length
    ? [...validPolicies].sort(
        (a, b) => (b.task_success_rate ?? -1) - (a.task_success_rate ?? -1)
      )[0]
    : null;
  const lowestUnsafePolicy = validPolicies.length
    ? [...validPolicies].sort(
        (a, b) => (a.unsafe_recovery_rate ?? 999) - (b.unsafe_recovery_rate ?? 999)
      )[0]
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
            <GitCompare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span>Recovery Policy Comparison</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Comparative empirical performance of 7 distinct recovery policies evaluated under
            controlled tool failure conditions.
          </p>
        </div>

        <button
          onClick={fetchComparison}
          disabled={loading}
          className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors shadow-xs"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Highlights / Summary KPI Row if runs exist */}
      {validPolicies.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Evaluated Policies</span>
              <BarChart3 className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {validPolicies.length} / 7
              </span>
              <span className="text-xs text-slate-500">tested</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Active recovery implementations
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Highest Task Success</span>
              <Award className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {highestSuccessPolicy?.task_success_rate !== null &&
                highestSuccessPolicy?.task_success_rate !== undefined
                  ? `${(highestSuccessPolicy.task_success_rate * 100).toFixed(0)}%`
                  : '—'}
              </span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                {highestSuccessPolicy?.policy_name.split(':')[0]}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              n = {highestSuccessPolicy?.sample_size} runs recorded
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Safety Benchmark</span>
              <ShieldAlert className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {lowestUnsafePolicy?.unsafe_recovery_rate !== null &&
                lowestUnsafePolicy?.unsafe_recovery_rate !== undefined
                  ? `${(lowestUnsafePolicy.unsafe_recovery_rate * 100).toFixed(1)}%`
                  : '0.0%'}
              </span>
              <span className="text-xs text-slate-500">unsafe rate</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Led by {lowestUnsafePolicy?.policy_name.split(':')[0]}
            </p>
          </div>
        </div>
      )}

      {/* Main Bar Chart */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200">
              Comparative Rates Across Evaluated Policies
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Task Success vs. Recovery Success vs. Unsafe Recovery (%)
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 self-start sm:self-auto">
            Dynamic aggregation over completed trials
          </span>
        </div>

        <div className="h-80 w-full pt-2">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -15, bottom: 25 }}>
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
                  itemStyle={{ color: chartTheme.tooltipText }}
                  labelStyle={{ fontWeight: 600, color: chartTheme.tooltipText, marginBottom: '4px' }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: '12px',
                    paddingTop: '12px',
                    color: chartTheme.legendText,
                  }}
                />
                <Bar
                  dataKey="taskSuccess"
                  name="Task Success %"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="recoverySuccess"
                  name="Recovery Success %"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="unsafeRate"
                  name="Unsafe Recovery %"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={RotateCcw}
              title="No policy comparison data yet"
              description="Execute experiments with different recovery policies to populate comparative rate metrics."
              actionLabel="Launch New Experiment"
              onAction={() => (window.location.href = '/experiments/new')}
            />
          )}
        </div>
      </div>

      {/* Side-by-Side Detailed Metric Table */}
      <div className="rounded-xl bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200">
            Detailed Policy Evaluation Matrix
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Full empirical breakdown by policy with sample sizes, latencies, and retry footprints
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#0b101d] text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-5">Policy Name</th>
                <th className="py-3 px-4">Sample Size (n)</th>
                <th className="py-3 px-4">Task Success</th>
                <th className="py-3 px-4">Recovery Success</th>
                <th className="py-3 px-4">Unsafe Rate</th>
                <th className="py-3 px-4">Mean Duration</th>
                <th className="py-3 px-4">Avg Retries</th>
                <th className="py-3 px-4">Est. Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {data?.policies && data.policies.length > 0 ? (
                data.policies.map((p) => {
                  const hasData = p.sample_size > 0;
                  return (
                    <tr
                      key={p.policy_id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-5 font-sans">
                        <div className="font-medium text-slate-900 dark:text-slate-200">
                          {p.policy_name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                          {p.policy_id}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                        {p.sample_size} runs
                      </td>
                      <td className="py-3.5 px-4">
                        {hasData && p.task_success_rate !== null ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {(p.task_success_rate * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {hasData && p.recovery_success_rate !== null ? (
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {(p.recovery_success_rate * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {hasData && p.unsafe_recovery_rate !== null ? (
                          <span
                            className={
                              p.unsafe_recovery_rate > 0
                                ? 'text-rose-600 dark:text-rose-400 font-bold'
                                : 'text-slate-600 dark:text-slate-400'
                            }
                          >
                            {(p.unsafe_recovery_rate * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        {hasData && p.mean_latency_ms !== null ? `${p.mean_latency_ms}ms` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {hasData && p.avg_retry_count !== null
                          ? p.avg_retry_count.toFixed(2)
                          : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {p.estimated_cost_usd !== null
                          ? `$${p.estimated_cost_usd.toFixed(4)}`
                          : 'null (simulated)'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-slate-500 font-sans"
                  >
                    No comparative data recorded yet. Run experiments with multiple policies to view the matrix.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Research Hypotheses & Guidelines */}
      <div className="p-5 rounded-xl bg-indigo-50/40 dark:bg-slate-900/40 border border-indigo-100 dark:border-slate-800 space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans shadow-xs">
        <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-400 font-semibold font-mono text-[11px] uppercase tracking-wider">
          <Info className="h-4 w-4" />
          <span>Research Question & Scientific Hypothesis Framework</span>
        </div>
        <p>
          <strong className="text-slate-900 dark:text-slate-200">Core Research Question:</strong>{' '}
          <em>
            "Can a budget-aware, safety-constrained recovery policy (Policy G) improve task completion
            for tool-using AI agents without disproportionate increases in latency, API cost, or
            unsafe recovery decisions?"
          </em>
        </p>
        <p>
          <strong className="text-slate-900 dark:text-slate-200">Methodological Safeguard:</strong> This
          hypothesis is tested strictly via measurable empirical evidence. Policy G is never assumed or
          claimed to be superior prior to controlled experimental observation. Standard baselines
          (Policy A: Stop, Policy B: Blind Retry, Policy C: Validation Retry, Policy D: Fallback,
          Policy E: Safe Stop, Policy F: Clarify) provide necessary experimental controls.
        </p>
      </div>
    </div>
  );
};
