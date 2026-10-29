import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckCircle2,
  Clock,
  RotateCcw,
  ShieldAlert,
  ArrowUpRight,
  Play,
  Layers,
  Activity,
  AlertTriangle,
  Info,
  Search,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../services/api';
import { DashboardStats, PolicyComparisonResponse } from '../types';
import { useTheme } from '../context/ThemeContext';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

export const Dashboard: React.FC = () => {
  const { chartTheme, resolvedTheme } = useTheme();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [comparison, setComparison] = useState<PolicyComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const totalRunsCount = stats?.total_runs || 0;

  const outcomeChartData = stats?.outcome_distribution
    ? Object.entries(stats.outcome_distribution).map(([key, value]) => ({
        name: key.replace('_', ' '),
        rawKey: key,
        value,
        pct: totalRunsCount > 0 ? ((value / totalRunsCount) * 100).toFixed(1) : '0',
        color: outcomeColors[key] || '#94a3b8',
      }))
    : [];

  const policyChartData =
    comparison?.policies?.map((p) => {
      const shortName = p.policy_name.includes(':')
        ? p.policy_name.split(':')[0].replace('Policy ', 'P-')
        : p.policy_id.replace('policy_', '');
      return {
        name: shortName,
        fullName: p.policy_name,
        successRate: p.task_success_rate !== null ? Math.round(p.task_success_rate * 100) : 0,
        recoveryRate: p.recovery_success_rate !== null ? Math.round(p.recovery_success_rate * 100) : 0,
        samples: p.sample_size,
      };
    }) || [];

  const filteredExperiments = (stats?.recent_experiments || []).filter((exp) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      exp.name.toLowerCase().includes(q) ||
      exp.policy_id.toLowerCase().includes(q) ||
      exp.scenario_id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <span>Reliability Overview</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Controlled empirical benchmark evaluating failure recovery, fault diagnosis accuracy, and
            safety boundaries across tool-using AI agents.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleQuickBenchmark}
            disabled={seeding}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-200 transition-colors shadow-2xs disabled:opacity-50"
          >
            <Play className={`h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 ${seeding ? 'animate-spin' : ''}`} />
            <span>{seeding ? 'Executing...' : 'Run Quick Benchmark'}</span>
          </button>

          <NavLink
            to="/experiments/new"
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-all shadow-xs shadow-indigo-600/30"
          >
            <span>New Custom Run</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </NavLink>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2.5 shadow-2xs">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <MetricCard
          label="Total Experiments"
          value={stats?.total_experiments ?? 0}
          icon={Layers}
          accentColor="slate"
          subtext={`${stats?.total_runs ?? 0} total executed runs`}
        />

        <MetricCard
          label="Task Success Rate"
          value={
            stats?.task_success_rate !== null && stats?.task_success_rate !== undefined
              ? `${(stats.task_success_rate * 100).toFixed(1)}%`
              : 'N/A'
          }
          icon={CheckCircle2}
          accentColor="emerald"
          subtext="Measured across all conditions"
        />

        <MetricCard
          label="Mean Duration"
          value={
            stats?.avg_latency_ms !== null && stats?.avg_latency_ms !== undefined
              ? `${stats.avg_latency_ms}ms`
              : 'N/A'
          }
          icon={Clock}
          accentColor="indigo"
          subtext="Execution wall-clock latency"
        />

        <MetricCard
          label="Active Policies"
          value="7"
          icon={RotateCcw}
          accentColor="amber"
          subtext="Policies A through G configured"
        />

        <MetricCard
          label="Fault Scenarios"
          value="10"
          icon={ShieldAlert}
          accentColor="rose"
          subtext="Controlled simulated faults"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policy Performance Bar Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f1728] shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Recovery Policy Performance
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Task success rate (%) and recovery rate (%) across evaluated policies
              </p>
            </div>
            <NavLink
              to="/comparison"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-mono flex items-center space-x-1"
            >
              <span>Full Matrix</span>
              <ArrowUpRight className="h-3 w-3" />
            </NavLink>
          </div>

          <div className="h-64 w-full flex-1 min-h-[250px]">
            {policyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={policyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
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
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    cursor={{ fill: resolvedTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: chartTheme.legendText }}
                  />
                  <Bar dataKey="successRate" name="Task Success Rate %" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recoveryRate" name="Recovery Rate %" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="No Policy Telemetry"
                description="Execute benchmark experiments with recovery policies to populate comparative charts."
                actionLabel="Run Quick Benchmark"
                onAction={handleQuickBenchmark}
              />
            )}
          </div>
        </div>

        {/* Outcome Breakdown Donut Chart */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f1728] shadow-xs flex flex-col">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Run Outcome Breakdown
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Empirical distribution of {totalRunsCount} recorded runs
            </p>
          </div>

          <div className="h-44 w-full flex-1 min-h-[170px]">
            {outcomeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={outcomeChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {outcomeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartTheme.tooltipBg,
                      borderColor: chartTheme.tooltipBorder,
                      color: chartTheme.tooltipText,
                      fontSize: '12px',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs font-mono">
                No runs recorded
              </div>
            )}
          </div>

          {/* Legend Items */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
            {outcomeChartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="capitalize text-slate-700 dark:text-slate-300">{item.name}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                  <span>{item.value} runs</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">({item.pct}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Experiments Table Section */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f1728] shadow-xs overflow-hidden">
        <div className="p-4 sm:px-5 sm:py-4 border-b border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recent Experiments
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Executed trial configurations, policies, and terminal statuses
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter experiments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-sans w-48"
              />
            </div>

            <NavLink
              to="/experiments/new"
              className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline px-2"
            >
              + New Run
            </NavLink>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#0b101c] text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800/80">
              <tr>
                <th className="py-3 px-5">Experiment</th>
                <th className="py-3 px-4">Policy</th>
                <th className="py-3 px-4">Fault Scenario</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {filteredExperiments.length > 0 ? (
                filteredExperiments.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3.5 px-5 font-sans font-medium text-slate-900 dark:text-slate-100 max-w-xs truncate">
                      {exp.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-700 dark:text-slate-300 font-mono">
                        {exp.policy_id.replace('policy_', '')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      <span className="text-slate-800 dark:text-slate-200">{exp.scenario_id}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={exp.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
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
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium inline-flex items-center space-x-1"
                      >
                        <span>Details</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </NavLink>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500 font-sans">
                    {searchQuery ? 'No experiments matching query.' : 'No experiments executed yet.'}{' '}
                    <button
                      onClick={handleQuickBenchmark}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium ml-1"
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

      {/* Methodological Transparency Callout */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-xs flex items-start space-x-3 text-xs text-slate-600 dark:text-slate-400">
        <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-900 dark:text-slate-200">
            Methodological Transparency
          </p>
          <p className="leading-relaxed">
            All statistics in this dashboard are computed dynamically from actual execution traces
            recorded in SQLite/PostgreSQL. Zero statistics are hardcoded or fabricated. In accordance with
            our research protocol, simulated costs are reported as null unless genuine token and pricing
            telemetry is provided by the provider backend.
          </p>
        </div>
      </div>
    </div>
  );
};
