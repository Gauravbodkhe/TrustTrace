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
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { api } from '../services/api';
import { PolicyComparisonResponse, PolicyComparisonRow } from '../types';

export const PolicyComparison: React.FC = () => {
  const [data, setData] = useState<PolicyComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComparison = async () => {
      try {
        setLoading(true);
        const res = await api.metrics.comparison();
        setData(res);
      } catch (err: any) {
        setError(err?.message || 'Failed to load policy comparison data');
      } finally {
        setLoading(false);
      }
    };
    fetchComparison();
  }, []);

  const chartData = data?.policies.map((p) => ({
    name: p.policy_name.replace('Policy ', '').split(':')[0],
    fullName: p.policy_name,
    taskSuccess: p.task_success_rate !== null ? Math.round(p.task_success_rate * 100) : 0,
    recoverySuccess: p.recovery_success_rate !== null ? Math.round(p.recovery_success_rate * 100) : 0,
    unsafeRate: p.unsafe_recovery_rate !== null ? Math.round(p.unsafe_recovery_rate * 100) : 0,
    latency: p.mean_latency_ms || 0,
    retries: p.avg_retry_count || 0,
    samples: p.sample_size,
  })) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2.5">
          <GitCompare className="h-5 w-5 text-indigo-400" />
          <span>Recovery Policy Comparison</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Comparative empirical performance of 7 distinct failure recovery policies evaluated under
          identical tool fault conditions.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Bar Chart */}
      <div className="p-5 rounded-xl bg-[#0f1524] border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">
              Comparative Rates (%) Across Evaluated Policies
            </h2>
            <p className="text-xs text-slate-400">
              Task Success vs. Recovery Success vs. Unsafe Recovery
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Computed from recorded experiment runs
          </span>
        </div>

        <div className="h-72 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 25 }}>
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    fontSize: '12px',
                    borderRadius: '8px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="taskSuccess" name="Task Success %" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="recoverySuccess"
                  name="Recovery Success %"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar dataKey="unsafeRate" name="Unsafe Recovery %" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono">
              <RotateCcw className="h-8 w-8 mb-2 opacity-40 text-slate-400" />
              <span>No completed experiment runs to compare.</span>
              <p className="text-[11px] text-slate-600 mt-1">
                Execute experiments with different recovery policies to populate comparative metrics.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Side-by-Side Detailed Metric Table */}
      <div className="rounded-xl bg-[#0f1524] border border-slate-800/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/80">
          <h2 className="text-sm font-semibold text-slate-200">
            Detailed Policy Evaluation Matrix
          </h2>
          <p className="text-xs text-slate-400">
            Full empirical breakdown by policy with sample sizes and latency characteristics
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b101c] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800/80">
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
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {data?.policies && data.policies.length > 0 ? (
                data.policies.map((p) => (
                  <tr key={p.policy_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-5 font-sans font-medium text-slate-200">
                      <div>{p.policy_name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{p.policy_id}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-bold">{p.sample_size} runs</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-semibold">
                      {p.task_success_rate !== null ? `${(p.task_success_rate * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-indigo-400 font-semibold">
                      {p.recovery_success_rate !== null
                        ? `${(p.recovery_success_rate * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.unsafe_recovery_rate !== null ? (
                        <span
                          className={
                            p.unsafe_recovery_rate > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'
                          }
                        >
                          {(p.unsafe_recovery_rate * 100).toFixed(1)}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {p.mean_latency_ms !== null ? `${p.mean_latency_ms}ms` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {p.avg_retry_count !== null ? p.avg_retry_count.toFixed(2) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {p.estimated_cost_usd !== null ? `$${p.estimated_cost_usd.toFixed(4)}` : 'null (simulated)'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                    No comparative data recorded yet. Run experiments with multiple policies to view the matrix.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Research Hypotheses & Guidelines */}
      <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3 text-xs text-slate-400 leading-relaxed font-sans">
        <div className="flex items-center space-x-2 text-indigo-400 font-semibold font-mono text-[11px] uppercase tracking-wider">
          <Info className="h-4 w-4" />
          <span>Research Question & Hypothesis Framework</span>
        </div>
        <p>
          <strong>Research Question:</strong> <em>"Can a budget-aware, safety-constrained recovery policy
          (Policy G) improve task completion for tool-using AI agents without disproportionate increases
          in latency, API cost, or unsafe recovery decisions?"</em>
        </p>
        <p>
          <strong>Methodological Safeguard:</strong> This hypothesis is tested purely via measurable
          empirical evidence. Policy G is not assumed or claimed to be superior prior to controlled
          experimental observation. Baseline policies (A: Stop, B: Blind Retry, C: Validation Retry, D:
          Fallback, E: Safe Stop, F: Clarify) provide standard experimental control baselines.
        </p>
      </div>
    </div>
  );
};
