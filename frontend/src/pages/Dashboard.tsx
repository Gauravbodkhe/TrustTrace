import React, { useEffect, useState, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Layers,
  ArrowRight,
  Play,
  FileText,
  Search,
  PlusCircle,
  Clock,
  Sparkles,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardStats, PolicyComparisonResponse } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [comparison, setComparison] = useState<PolicyComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [seeding, setSeeding] = useState(false);

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
      setError(err?.message || 'Could not connect to the backend server. Please check if the backend is online.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuickStart = async () => {
    try {
      setSeeding(true);
      setError(null);
      const exp = await api.experiments.create({
        name: 'Quick Test: Bounded Retry Evaluation',
        description: 'Automatic test evaluating bounded exponential retries under transient 503 errors.',
        agent_type: 'mock',
        policy_id: 'policy_b_bounded_retry',
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
      await fetchData();
      navigate(`/experiments/${exp.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to start quick test');
    } finally {
      setSeeding(false);
    }
  };

  const filteredExperiments = useMemo(() => {
    const list = stats?.recent_experiments || [];
    if (!searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase();
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.policy_id.toLowerCase().includes(query) ||
        e.scenario_id.toLowerCase().includes(query) ||
        e.id.toLowerCase().includes(query)
    );
  }, [stats?.recent_experiments, searchQuery]);

  const recoveryRateVal = stats?.recovery_success_rate ?? stats?.task_success_rate;
  const recoveryPctText =
    recoveryRateVal !== null && recoveryRateVal !== undefined
      ? `${(recoveryRateVal * 100).toFixed(1)}%`
      : 'N/A';

  const avgLatencyText =
    stats?.avg_latency_ms !== null && stats?.avg_latency_ms !== undefined
      ? `${stats.avg_latency_ms.toFixed(0)} ms`
      : 'N/A';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Dashboard
            </h1>
            <span className="sr-only">TrustTrace Dashboard</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            See how well AI agents recover from errors when tools fail.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleQuickStart}
            disabled={seeding}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer"
          >
            <Play className={`h-4 w-4 ${seeding ? 'animate-spin' : ''}`} />
            <span>{seeding ? 'Starting...' : 'Quick Start Experiment'}</span>
          </button>

          <NavLink
            to="/reports"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors"
          >
            <FileText className="h-4 w-4 text-slate-500" />
            <span>View Full Report</span>
          </NavLink>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs sm:text-sm text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchData}
            className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/60 font-semibold hover:bg-rose-200 dark:hover:bg-rose-800 text-xs transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Experiments */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c121e] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Experiments
            </span>
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {loading ? '...' : stats?.total_experiments ?? 0}
            </span>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Total Tests
            </span>
          </div>
        </div>

        {/* Successful Experiments */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c121e] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Successful Experiments
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {loading ? '...' : stats?.successful_experiments ?? 0}
            </span>
            <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">
              Passed
            </span>
          </div>
        </div>

        {/* Failed Experiments */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c121e] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Failed Experiments
            </span>
            <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <XCircle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400">
              {loading ? '...' : stats?.failed_experiments ?? 0}
            </span>
            <span className="text-[11px] text-rose-600/80 dark:text-rose-400/80 font-medium">
              Unresolved
            </span>
          </div>
        </div>

        {/* Recovery Success Rate */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c121e] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Recovery Success Rate
            </span>
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <RotateCcw className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {loading ? '...' : recoveryPctText}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Real Data
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Real Telemetry Bar */}
      <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0f172a]/40 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-500 dark:text-slate-400">Average Execution Time:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{avgLatencyText}</span>
          </div>

          <div className="flex items-center space-x-2">
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-500 dark:text-slate-400">Total Retry Attempts:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{stats?.total_retries ?? 0}</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 dark:text-slate-500">
          All numbers calculated strictly from database execution records.
        </div>
      </div>

      {/* Compare Methods Quick Preview */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c121e] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
              Compare Error-Handling Methods
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Empirical recovery rate comparison across all tested recovery strategies.
            </p>
          </div>
          <NavLink
            to="/reports"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center space-x-1"
          >
            <span>View Full Report</span>
            <ArrowRight className="h-3 w-3" />
          </NavLink>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(comparison?.policies || []).slice(0, 6).map((policy) => {
            const rate = policy.recovery_success_rate !== null ? Math.round(policy.recovery_success_rate * 100) : null;
            return (
              <div
                key={policy.policy_id}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-900/30"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate" title={policy.policy_name}>
                    {policy.policy_name.split(':')[0]}
                  </span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {rate !== null ? `${rate}%` : 'No runs'}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${rate ?? 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Experiments Section */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c121e] shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Recent Experiments
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Latest tests recorded in the database.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-48 sm:w-60"
              />
            </div>
            <NavLink
              to="/experiments"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
            >
              View All
            </NavLink>
          </div>
        </div>

        {/* Table / Empty State */}
        <div className="overflow-x-auto">
          {filteredExperiments.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                No experiments yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Run your first test or choose a standard benchmark from the Test Cases page.
              </p>
              <div className="mt-4 flex items-center justify-center space-x-3">
                <button
                  onClick={handleQuickStart}
                  disabled={seeding}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Quick Start Experiment
                </button>
                <NavLink
                  to="/test-cases"
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                >
                  Browse Test Cases
                </NavLink>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#0a0f1d] text-slate-500 dark:text-slate-400 font-medium uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-5">Experiment Name</th>
                  <th className="py-3 px-4">Method Used</th>
                  <th className="py-3 px-4">Test Problem</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredExperiments.map((exp) => (
                  <tr
                    key={exp.id}
                    onClick={() => navigate(`/experiments/${exp.id}`)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-5 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                      {exp.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {exp.policy_id.replace('policy_', '')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      {exp.scenario_id}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={exp.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(exp.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <NavLink
                        to={`/experiments/${exp.id}`}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 inline-flex items-center space-x-1"
                      >
                        <span>Details</span>
                        <ArrowRight className="h-3 w-3" />
                      </NavLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
