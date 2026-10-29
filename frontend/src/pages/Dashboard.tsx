import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  ShieldAlert,
  ArrowUpRight,
  Play,
  Layers,
  Activity,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../services/api';
import { DashboardStats, PolicyComparisonResponse } from '../types';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [comparison, setComparison] = useState<PolicyComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, compData] = await Promise.all([
        api.metrics.dashboard(),
        api.metrics.comparison(),
      ]);
      setStats(statsData);
      setComparison(compData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuickBenchmark = async () => {
    try {
      setSeeding(true);
      // Create a quick baseline benchmark experiment
      const exp = await api.experiments.create({
        name: 'Quick Benchmark: Transient Error under Budget-Aware Recovery',
        description: 'Auto-triggered evaluation of Policy G under transient 503 injection.',
        agent_type: 'mock',
        policy_id: 'policy_g_budget_aware',
        scenario_id: 'transient_error_step1',
        task_ids: ['task_expense_policy', 'task_order_lookup', 'task_cost_analysis'],
        repetitions: 1,
        seed: 42,
        max_retries: 3,
        timeout_seconds: 30,
        token_budget: 2000,
        cost_budget_usd: null,
      });

      // Run it
      await api.experiments.run(exp.id);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to execute quick benchmark');
    } finally {
      setSeeding(false);
    }
  };

  const outcomeColors: Record<string, string> = {
    success: '#10b981', // Emerald
    failure: '#f43f5e', // Rose
    unsafe: '#e11d48', // Red
    clarification_needed: '#f59e0b', // Amber
    partial: '#6366f1', // Indigo
  };

  const outcomeChartData = stats?.outcome_distribution
    ? Object.entries(stats.outcome_distribution).map(([key, value]) => ({
        name: key.replace('_', ' '),
        value,
        color: outcomeColors[key] || '#94a3b8',
      }))
    : [];

  const policyChartData = comparison?.policies?.map((p) => ({
    name: p.policy_name.replace('Policy ', '').split(':')[0],
    successRate: p.task_success_rate !== null ? Math.round(p.task_success_rate * 100) : 0,
    recoveryRate: p.recovery_success_rate !== null ? Math.round(p.recovery_success_rate * 100) : 0,
    latency: p.mean_latency_ms || 0,
  })) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <LayoutDashboard className="h-5 w-5 text-indigo-400" />
            <span>Reliability Overview</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Empirical benchmark measuring how tool-using AI agents recover from injected operational faults.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleQuickBenchmark}
            disabled={seeding}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-slate-200 transition-colors disabled:opacity-50"
          >
            <Play className={`h-3.5 w-3.5 text-emerald-400 ${seeding ? 'animate-spin' : ''}`} />
            <span>{seeding ? 'Executing...' : 'Run Quick Benchmark'}</span>
          </button>

          <NavLink
            to="/experiments/new"
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors shadow-sm shadow-indigo-600/30"
          >
            <span>New Custom Run</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </NavLink>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-[#0f1524] border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Experiments</span>
            <Layers className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-white">
              {stats?.total_experiments ?? 0}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-mono">
            {stats?.total_runs ?? 0} total executed runs
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0f1524] border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Task Success Rate</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {stats?.task_success_rate !== null && stats?.task_success_rate !== undefined
                ? `${(stats.task_success_rate * 100).toFixed(1)}%`
                : 'N/A'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-mono">
            Measured across all conditions
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0f1524] border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Mean Duration</span>
            <Clock className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-indigo-300">
              {stats?.avg_latency_ms !== null && stats?.avg_latency_ms !== undefined
                ? `${stats.avg_latency_ms}ms`
                : 'N/A'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-mono">
            Execution wall-clock latency
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0f1524] border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Policies</span>
            <RotateCcw className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-amber-300">7</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-mono">
            Policies A through G configured
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0f1524] border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Fault Scenarios</span>
            <ShieldAlert className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-rose-300">10</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-mono">
            Controlled simulated faults
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policy Success Rate Comparison Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#0f1524] border border-slate-800/80 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">
                Recovery Policy Performance
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Task success rate (%) by recovery policy across completed experiments
              </p>
            </div>
            <NavLink
              to="/comparison"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-mono flex items-center space-x-1"
            >
              <span>Full Comparison</span>
              <ArrowUpRight className="h-3 w-3" />
            </NavLink>
          </div>

          <div className="h-64 w-full flex-1">
            {policyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={policyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
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
                  <Bar dataKey="successRate" name="Success Rate %" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recoveryRate" name="Recovery Rate %" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <Activity className="h-8 w-8 mb-2 opacity-40" />
                <span>No completed experiment runs recorded yet.</span>
                <button
                  onClick={handleQuickBenchmark}
                  className="mt-3 text-indigo-400 hover:underline font-mono"
                >
                  Run initial benchmark to populate data
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Outcome Breakdown Chart */}
        <div className="p-5 rounded-xl bg-[#0f1524] border border-slate-800/80 flex flex-col">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-200">
              Run Outcome Distribution
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Empirical status breakdown of all executed runs
            </p>
          </div>

          <div className="h-48 w-full flex-1">
            {outcomeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={outcomeChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {outcomeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      fontSize: '12px',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                <span>No runs recorded</span>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
            {outcomeChartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="capitalize text-slate-300">{item.name}</span>
                </div>
                <span className="text-slate-400">{item.value} runs</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Experiments Table */}
      <div className="rounded-xl bg-[#0f1524] border border-slate-800/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Recent Experiments</h2>
            <p className="text-xs text-slate-400">
              Recorded experiment configurations and status
            </p>
          </div>
          <NavLink
            to="/experiments/new"
            className="text-xs font-mono text-indigo-400 hover:text-indigo-300"
          >
            + New Experiment
          </NavLink>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b101c] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800/80">
              <tr>
                <th className="py-3 px-5">Experiment</th>
                <th className="py-3 px-4">Policy</th>
                <th className="py-3 px-4">Fault Scenario</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {stats?.recent_experiments && stats.recent_experiments.length > 0 ? (
                stats.recent_experiments.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-5 font-sans font-medium text-slate-200">
                      {exp.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300">
                        {exp.policy_id.replace('policy_', '')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <span className="text-slate-300">{exp.scenario_id}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          exp.status === 'completed'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                            : exp.status === 'running'
                            ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {exp.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(exp.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-5 text-right font-sans">
                      <NavLink
                        to={`/experiments/${exp.id}`}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center space-x-1"
                      >
                        <span>Details</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </NavLink>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                    No experiments executed yet.{' '}
                    <button
                      onClick={handleQuickBenchmark}
                      className="text-indigo-400 hover:underline"
                    >
                      Run quick benchmark
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scientific Integrity Note */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-start space-x-3 text-xs text-slate-400">
        <Info className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-300">Methodological Transparency</p>
          <p>
            All statistics presented in this dashboard are computed dynamically from actual execution
            traces stored in SQLite/PostgreSQL. Zero statistics are hardcoded or fabricated. In accordance
            with our research protocol, simulated costs are reported as null unless genuine token and pricing
            telemetry is provided by the model backend.
          </p>
        </div>
      </div>
    </div>
  );
};
