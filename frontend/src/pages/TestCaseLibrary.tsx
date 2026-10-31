import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { SampleTestCase } from '../types';
import {
  ListChecks,
  Play,
  Copy,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export const TestCaseLibrary: React.FC = () => {
  const navigate = useNavigate();
  const [testCases, setTestCases] = useState<SampleTestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<{ id: string; success: boolean; text: string } | null>(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await api.testCases.list();
      setTestCases(data);
    } catch (err: any) {
      console.error('Failed to load test cases', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleRunCase = async (tc: SampleTestCase) => {
    setRunningId(tc.id);
    setRunMessage(null);
    try {
      const res = await api.testCases.run(tc.id);
      setRunMessage({
        id: tc.id,
        success: true,
        text: `Executed successfully! Recovery: ${res.expected_recovery}. Experiment #${res.experiment_id.slice(0, 8)} created.`,
      });
    } catch (err: any) {
      setRunMessage({
        id: tc.id,
        success: false,
        text: err.message || 'Run failed to execute.',
      });
    } finally {
      setRunningId(null);
    }
  };

  const handleDuplicate = (tc: SampleTestCase) => {
    // Navigate to Create Experiment with prefilled fields
    navigate('/experiments/new', {
      state: {
        prefill: {
          name: `Copy of ${tc.name}`,
          description: tc.description,
          policy_id: tc.recommended_policy_id,
          scenario_id: tc.scenario_id,
          task_ids: tc.task_ids,
          max_retries: tc.default_params?.max_retries ?? 2,
          timeout_seconds: tc.default_params?.timeout_seconds ?? 15,
        },
      },
    });
  };

  const categories = Array.from(new Set(testCases.map((c) => c.fault_category))).filter(Boolean);

  const filteredCases = testCases.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase()) ||
      c.expected_recovery.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || c.fault_category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Test Case Library
            </h1>
            <span className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
              10 Standard Benchmarks
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Standard fault scenarios from the AI reliability benchmark. Run each case directly to evaluate recovery behavior.
          </p>
        </div>

        <button
          onClick={() => navigate('/experiments/new')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-sm font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <Sparkles className="h-4 w-4" />
          <span>Create Custom Test</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search test cases or expected recoveries..."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Fault Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Test Case Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse p-6"
            />
          ))}
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 p-8">
          <ListChecks className="mx-auto h-10 w-10 text-slate-400 mb-2" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            No test cases match your criteria
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Try adjusting your search terms or filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCases.map((tc) => {
            const isRunning = runningId === tc.id;
            const msg = runMessage?.id === tc.id ? runMessage : null;

            return (
              <div
                key={tc.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/40">
                        {tc.id}
                      </span>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                        {tc.name}
                      </h3>
                    </div>
                    {tc.is_sample && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        Sample Case
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    {tc.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-mono uppercase">
                        Fault Scenario
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-200 capitalize">
                        {tc.fault_category.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-emerald-700 dark:text-emerald-400 block text-[10px] font-mono uppercase">
                        Expected Recovery
                      </span>
                      <span className="font-semibold text-emerald-900 dark:text-emerald-300">
                        {tc.expected_recovery}
                      </span>
                    </div>
                  </div>

                  {msg && (
                    <div
                      className={`mb-4 rounded-xl p-3 text-xs flex items-start gap-2 ${
                        msg.success
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {msg.success ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                      )}
                      <span>{msg.text}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Target: {tc.task_ids?.[0] || 'Benchmark Task'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDuplicate(tc)}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Duplicate or customize parameters"
                    >
                      <Copy className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleRunCase(tc)}
                      disabled={isRunning}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      {isRunning ? (
                        <>
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Running...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          <span>Run Case</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
