import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Layers,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  FlaskConical,
} from 'lucide-react';
import { api } from '../services/api';
import { ExperimentListItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

export const ExperimentsList: React.FC = () => {
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState<ExperimentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchExperiments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.experiments.list(100, 0);
      setExperiments(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load experiments list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, []);

  const filteredExperiments = useMemo(() => {
    return experiments.filter((exp) => {
      const matchesSearch =
        exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.policy_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.scenario_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || exp.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [experiments, searchQuery, statusFilter]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
            <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span>Previous Tests</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            View, search, and check results from all previous tests.
          </p>
        </div>

        <Link
          to="/experiments/new"
          className="self-start sm:self-auto flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-all shadow-xs"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>New Test</span>
        </Link>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search tests by name, method, or problem..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-slate-400 hidden sm:inline" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>

          <button
            onClick={fetchExperiments}
            disabled={loading}
            title="Refresh list"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Experiments Table */}
      {filteredExperiments.length > 0 ? (
        <div className="rounded-xl bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#0b101d] text-slate-500 dark:text-slate-400 uppercase text-[10px] font-mono tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-5">Test Name</th>
                  <th className="py-3 px-4">Method Used</th>
                  <th className="py-3 px-4">Test Problem</th>
                  <th className="py-3 px-4">Runs</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {filteredExperiments.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    onClick={() => navigate(`/experiments/${exp.id}`)}
                  >
                    <td className="py-3 px-5">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {exp.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                        {exp.id.slice(0, 13)}...
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                      {exp.policy_id.replace('policy_', '').replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {exp.scenario_id.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {exp.repetitions}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={exp.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(exp.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/experiments/${exp.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center space-x-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                      >
                        <span>View Details</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={FlaskConical}
          title="No tests found"
          description={
            searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search query or filter options.'
              : 'You have not run any tests yet. Click below to start your first test.'
          }
          actionLabel="Run First Test"
          onAction={() => navigate('/experiments/new')}
        />
      )}
    </div>
  );
};
