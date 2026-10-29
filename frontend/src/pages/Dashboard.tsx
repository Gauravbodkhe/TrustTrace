import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckCircle2,
  RotateCcw,
  Layers,
  Activity,
  AlertTriangle,
  Info,
  Search,
  PlusCircle,
  Eye,
  Trophy,
  ArrowRight,
  Play,
  FileText,
  Mic,
  ShieldAlert,
  Sparkles,
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
} from 'recharts';
import { api } from '../services/api';
import { DashboardStats, PolicyComparisonResponse } from '../types';
import { useTheme } from '../context/ThemeContext';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { VoiceMicButton } from '../voice/VoiceMicButton';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
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

  const openVoiceAssistant = () => {
    window.dispatchEvent(new CustomEvent('trusttrace:open-voice'));
  };

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

  // Determine best performing policy with stated metric criteria
  const evaluatedPolicies = (comparison?.policies || [])
    .filter((p) => p.sample_size > 0 && p.task_success_rate !== null)
    .sort(
      (a, b) =>
        ((b.task_success_rate || 0) + (b.recovery_success_rate || 0)) -
        ((a.task_success_rate || 0) + (a.recovery_success_rate || 0))
    );

  const bestPolicy = stats?.best_policy
    ? {
        policy_id: stats.best_policy.policy_id,
        policy_name: stats.best_policy.policy_name,
        sample_size: stats.best_policy.sample_size,
        task_success_rate: stats.best_policy.task_success_rate,
        recovery_success_rate: stats.best_policy.recovery_success_rate ?? null,
        metric_description:
          stats.best_policy.metric_description ||
          'Ranked by highest composite task success rate and fault recovery rate across completed experimental runs.',
      }
    : evaluatedPolicies.length > 0
    ? {
        policy_id: evaluatedPolicies[0].policy_id,
        policy_name: evaluatedPolicies[0].policy_name,
        sample_size: evaluatedPolicies[0].sample_size,
        task_success_rate: evaluatedPolicies[0].task_success_rate,
        recovery_success_rate: evaluatedPolicies[0].recovery_success_rate,
        metric_description:
          'Ranked by highest composite task success rate and fault recovery rate across completed experimental runs.',
      }
    : null;

  const mostCommonFailures = stats?.most_common_failures || [];

  const recentExperiments = stats?.recent_experiments || [];
  const filteredExperiments = recentExperiments.filter((exp) => {
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
      {/* Top Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <span>TrustTrace Dashboard</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Empirical benchmark platform for evaluating tool-failure recovery in AI agents.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Prominent Generate Overall Report Button */}
          <NavLink
            to="/reports"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition-colors shadow-2xs"
            title="Generate reproducible research report and vector PDF"
          >
            <FileText className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Generate Overall Report</span>
          </NavLink>

          {/* Voice Assistant Trigger */}
          <button
            onClick={openVoiceAssistant}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors shadow-2xs"
            title="Open TrustTrace Voice Assistant"
          >
            <Mic className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Voice Assistant</span>
          </button>

          <button
            onClick={handleQuickBenchmark}
            disabled={seeding}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors shadow-2xs disabled:opacity-50"
            title="Automatically run a benchmark test with simulated failure to quickly view metrics"
          >
            <Play className={`h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 ${seeding ? 'animate-spin' : ''}`} />
            <span>{seeding ? 'Running...' : 'Quick Benchmark'}</span>
          </button>

          <NavLink
            to="/experiments"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors shadow-2xs"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>View Experiments</span>
          </NavLink>

          <NavLink
            to="/experiments/new"
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-all shadow-xs shadow-indigo-600/30"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Experiment</span>
          </NavLink>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2.5 shadow-2xs">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Exactly 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Experiments"
          value={stats?.total_experiments ?? 0}
          icon={Layers}
          accentColor="slate"
          subtext="Total number of experiments created"
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
          subtext="Percentage of tasks that finished without unhandled errors"
        />

        <MetricCard
          label="Recovery Success Rate"
          value={
            stats?.recovery_success_rate !== null && stats?.recovery_success_rate !== undefined
              ? `${(stats.recovery_success_rate * 100).toFixed(1)}%`
              : 'N/A'
          }
          icon={RotateCcw}
          accentColor="amber"
          subtext="Percentage of failures that were recovered"
        />

        <MetricCard
          label="Total Runs"
          value={stats?.total_runs ?? 0}
          icon={Activity}
          accentColor="indigo"
          subtext="Total individual task runs executed across all experiments"
        />
      </div>

      {/* Highlights Row: Best Performing Policy & Voice Assistant Quick Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Best-Performing Policy Card with Stated Metric Criteria (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f1728] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60 mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Best-Performing Policy
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Stated metric ranking based on empirical test results
                  </p>
                </div>
              </div>

              {bestPolicy && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Top Ranked
                </span>
              )}
            </div>

            {bestPolicy ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {bestPolicy.policy_name}
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    ID: {bestPolicy.policy_id}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500 block">
                      Task Success
                    </span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {bestPolicy.task_success_rate !== null ? `${(bestPolicy.task_success_rate * 100).toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500 block">
                      Recovery Rate
                    </span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {bestPolicy.recovery_success_rate !== null ? `${(bestPolicy.recovery_success_rate * 100).toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500 block">
                      Evaluated Runs
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {bestPolicy.sample_size} runs
                    </span>
                  </div>
                </div>

                {/* Stated Metric Criteria Explanation */}
                <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-indigo-50/50 dark:bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40 space-y-1">
                  <span className="font-semibold text-indigo-700 dark:text-indigo-300 block">
                    Ranking Criteria:
                  </span>
                  <p>
                    {bestPolicy.metric_description ||
                      'Ranked by highest composite task success rate and fault recovery rate across completed experimental runs.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 text-xs">
                No policy runs have completed yet. Run experiments to evaluate recovery policies.
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex justify-end">
            <NavLink
              to="/comparison"
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center space-x-1"
            >
              <span>Compare all 7 recovery policies</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </NavLink>
          </div>
        </div>

        {/* Voice Assistant Quick Action Card (1 col) */}
        <div className="p-5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/20 dark:from-indigo-950/30 dark:via-[#0f1728] dark:to-purple-950/20 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-indigo-100 dark:border-indigo-900/40 mb-3">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                <Mic className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                  <span>Voice Assistant</span>
                  <Sparkles className="h-3 w-3 text-amber-500" />
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Hands-free experiment controls
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
              Use natural voice commands to control tests, filter runs, generate vector reports, and hear speech syntheses of failure diagnoses.
            </p>

            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Try saying:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  "Compare all recovery policies"
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  "Generate overall report"
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  "Explain why this run failed"
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-900/40">
            <button
              onClick={openVoiceAssistant}
              className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-colors shadow-xs shadow-indigo-600/30"
            >
              <Mic className="h-3.5 w-3.5" />
              <span>Launch Voice Assistant</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-6">
        {/* Policy Comparison & Most Common Failures Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Section 1: Recovery Policy Comparison (2 cols) */}
          <div className="lg:col-span-2 p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f1728] shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/60">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Recovery Policy Comparison
                  </h2>
                  {bestPolicy && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <Trophy className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Best: {bestPolicy.policy_name.split(':')[0]}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Compare overall task success rate and recovery capability across all 7 evaluated recovery strategies.
                </p>
              </div>

              <NavLink
                to="/comparison"
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center space-x-1 self-start sm:self-auto"
              >
                <span>Full Matrix</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </NavLink>
            </div>

            {/* Simple Policy Bar Chart */}
            <div className="h-64 w-full min-h-[250px]">
              {policyChartData.some((p) => p.samples > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={policyChartData} margin={{ top: 10, right: 15, left: -20, bottom: 20 }}>
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
                      formatter={(value: any, name: any) => [`${value}%`, name]}
                      labelFormatter={(label: any) => {
                        const item = policyChartData.find((p) => p.name === label);
                        return item ? `${item.fullName} (${item.samples} runs)` : label;
                      }}
                      cursor={{ fill: resolvedTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: chartTheme.legendText }}
                    />
                    <Bar dataKey="successRate" name="Task Success Rate %" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="recoveryRate" name="Recovery Success Rate %" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    No policy benchmark data recorded yet
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                    Run experiments or trigger the quick benchmark to see how different recovery policies perform when tools fail.
                  </p>
                  <button
                    onClick={handleQuickBenchmark}
                    disabled={seeding}
                    className="mt-3 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
                  >
                    {seeding ? 'Running Benchmark...' : 'Run Quick Benchmark Now'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Most Common Failures Card (1 col) */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f1728] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60 mb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Most Common Failures
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Injected fault distribution & recovery
                    </p>
                  </div>
                </div>

                <NavLink
                  to="/evidence"
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  Evidence Logs
                </NavLink>
              </div>

              {mostCommonFailures.length > 0 ? (
                <div className="space-y-3">
                  {mostCommonFailures.slice(0, 5).map((fail) => {
                    const totalFailures = fail.total_failures ?? fail.count;
                    const recoveredFailures =
                      fail.recovered_failures ??
                      Math.round(totalFailures * (fail.recovery_rate || 0));
                    const recPct =
                      fail.recovery_rate !== null ? Math.round(fail.recovery_rate * 100) : null;
                    return (
                      <div
                        key={fail.category}
                        className="p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={fail.category}>
                            {fail.category}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            {totalFailures} {totalFailures === 1 ? 'failure' : 'failures'}
                          </span>
                        </div>

                        {/* Recovery mini-progress bar */}
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                            <span>Recovery Rate</span>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                              {recPct !== null ? `${recPct}% (${recoveredFailures}/${totalFailures})` : '0%'}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                              style={{ width: `${recPct ?? 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-slate-500 dark:text-slate-400 text-xs">
                  <p>No tool failures recorded yet.</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Execute experiments with fault scenarios to observe tool breakdowns.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-right">
              <NavLink
                to="/scenarios"
                className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                View Fault Scenarios &rarr;
              </NavLink>
            </div>
          </div>
        </div>

        {/* Section 2: Recent Experiments */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f1728] shadow-xs overflow-hidden">
          <div className="p-4 sm:px-5 sm:py-4 border-b border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Recent Experiments
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Latest test configurations, recovery strategies, and outcomes
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative flex items-center">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter experiments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-9 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-sans w-52"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                  <VoiceMicButton
                    onTranscript={(text) => setSearchQuery(text)}
                    size="sm"
                    title="Voice search experiments"
                  />
                </div>
              </div>

              <NavLink
                to="/experiments"
                className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800"
              >
                View All
              </NavLink>
            </div>
          </div>

          <div className="overflow-x-auto">
            {recentExperiments.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
                  <Layers className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  No experiments yet.
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Run your first experiment to see how AI agents handle tool failures.
                </p>
                <div className="mt-4 flex items-center justify-center space-x-3">
                  <NavLink
                    to="/experiments/new"
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-all shadow-xs"
                  >
                    Create First Experiment
                  </NavLink>
                  <button
                    onClick={handleQuickBenchmark}
                    disabled={seeding}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {seeding ? 'Running...' : 'Run Quick Benchmark'}
                  </button>
                </div>
              </div>
            ) : filteredExperiments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                No experiments matching "{searchQuery}".
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#0b101c] text-slate-500 dark:text-slate-400 font-medium uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800/80">
                  <tr>
                    <th className="py-3 px-5">Experiment Name</th>
                    <th className="py-3 px-4">Policy</th>
                    <th className="py-3 px-4">Fault Scenario</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredExperiments.map((exp) => (
                    <tr
                      key={exp.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => (window.location.href = `#/experiments/${exp.id}`)}
                    >
                      <td className="py-3.5 px-5 font-medium text-slate-900 dark:text-slate-100 max-w-xs truncate">
                        {exp.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                          {exp.policy_id.replace('policy_', '')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        <span className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">{exp.scenario_id}</span>
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
                      <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <NavLink
                          to={`/experiments/${exp.id}`}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium inline-flex items-center space-x-1"
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

        {/* Methodological Transparency Callout */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-xs flex items-start space-x-3 text-xs text-slate-600 dark:text-slate-400">
          <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-900 dark:text-slate-200">
              Methodological Transparency
            </p>
            <p className="leading-relaxed">
              All statistics in this dashboard are computed dynamically from actual execution traces
              recorded in the database. Zero statistics are hardcoded or fabricated. In accordance with
              scientific standards, external LLM costs are reported as null unless genuine token and pricing
              telemetry is recorded.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
