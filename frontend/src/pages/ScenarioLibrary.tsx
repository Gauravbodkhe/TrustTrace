import React, { useEffect, useState, useMemo } from 'react';
import {
  AlertTriangle,
  Plus,
  ShieldAlert,
  Edit2,
  X,
  Info,
  Search,
} from 'lucide-react';
import { api } from '../services/api';
import { FaultScenario } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

export const ScenarioLibrary: React.FC = () => {
  const [scenarios, setScenarios] = useState<FaultScenario[]>([]);
  const [_loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingScenario, setEditingScenario] = useState<FaultScenario | null>(null);

  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('transient_error');
  const [formProb, setFormProb] = useState<number>(1.0);
  const [formStep, setFormStep] = useState<string>('1');
  const [formDelay, setFormDelay] = useState<number>(0);
  const [formSeverity, setFormSeverity] = useState('medium');

  const categories = [
    'timeout',
    'tool_unavailable',
    'malformed_json',
    'missing_fields',
    'invalid_arguments',
    'empty_response',
    'stale_data',
    'transient_error',
    'rate_limit',
    'schema_validation',
  ];

  const fetchScenarios = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await api.scenarios.list();
      setScenarios(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load fault scenario catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  const openCreateModal = () => {
    setEditingScenario(null);
    setFormName('');
    setFormDesc('');
    setFormCategory('transient_error');
    setFormProb(1.0);
    setFormStep('1');
    setFormDelay(0);
    setFormSeverity('medium');
    setShowModal(true);
  };

  const openEditModal = (scenario: FaultScenario) => {
    setEditingScenario(scenario);
    setFormName(scenario.name);
    setFormDesc(scenario.description);
    setFormCategory(scenario.category);
    setFormProb(scenario.probability);
    setFormStep(scenario.deterministic_step !== null ? String(scenario.deterministic_step) : '');
    setFormDelay(scenario.failure_delay_ms);
    setFormSeverity(scenario.severity);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingScenario) {
        await api.scenarios.update(editingScenario.id, {
          name: formName,
          description: formDesc,
          probability: formProb,
          deterministic_step: formStep ? parseInt(formStep) : null,
          failure_delay_ms: formDelay,
          severity: formSeverity,
        });
      } else {
        await api.scenarios.create({
          name: formName,
          description: formDesc,
          category: formCategory,
          probability: formProb,
          deterministic_step: formStep ? parseInt(formStep) : null,
          failure_delay_ms: formDelay,
          severity: formSeverity,
          seed: 42,
        });
      }
      setShowModal(false);
      await fetchScenarios();
    } catch (err: any) {
      setError(err?.message || 'Failed to save scenario');
    }
  };

  const filteredScenarios = useMemo(() => {
    return scenarios.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSeverity =
        selectedSeverity === 'all' || s.severity.toLowerCase() === selectedSeverity;

      const matchesCategory =
        selectedCategory === 'all' || s.category.toLowerCase() === selectedCategory;

      return matchesSearch && matchesSeverity && matchesCategory;
    });
  }, [scenarios, searchQuery, selectedSeverity, selectedCategory]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
            <ShieldAlert className="h-5 w-5 text-rose-500" />
            <span>Fault Scenarios</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Explore and configure test problems used to see how AI agents handle errors.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="self-start sm:self-auto flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-all shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Test Problem</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Transparency / Safety Notice */}
      <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-slate-900/40 border border-amber-200/80 dark:border-slate-800 flex items-start space-x-3 text-xs text-slate-600 dark:text-slate-400 shadow-xs">
        <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <p>
          <strong className="text-slate-800 dark:text-slate-200">Safety Notice:</strong> All test
          problems are simulated inside TrustTrace. No external servers or real APIs are affected.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search test problems by name, category, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="flex-1 md:flex-none px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
          >
            <option value="all">All Severities</option>
            <option value="low">Low Severity</option>
            <option value="medium">Medium Severity</option>
            <option value="high">High Severity</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 md:flex-none px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Scenarios Grid */}
      {filteredScenarios.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScenarios.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-xl bg-white dark:bg-[#0f172a]/60 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    {s.name}
                  </h2>
                  <StatusBadge status={s.severity} size="sm" />
                </div>

                <div className="mt-1.5 inline-block px-2 py-0.5 rounded font-mono text-[10px] uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 font-medium">
                  {s.category}
                </div>

                <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                  {s.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span>Chance of Failure: {(s.probability * 100).toFixed(0)}%</span>
                  <span>
                    {s.deterministic_step !== null
                      ? `Happens on Step ${s.deterministic_step}`
                      : 'Random Step'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    ID: {s.id}
                  </span>
                  <button
                    onClick={() => openEditModal(s)}
                    className="flex items-center space-x-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Configure</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ShieldAlert}
          title="No matching test problems found"
          description={
            searchQuery || selectedSeverity !== 'all' || selectedCategory !== 'all'
              ? 'Try adjusting your search criteria or filters.'
              : 'The test problem catalog is empty.'
          }
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedSeverity('all');
            setSelectedCategory('all');
          }}
        />
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                {editingScenario ? 'Configure Test Problem' : 'Create Custom Test Problem'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Problem Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Description / What Happens
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 font-mono">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    disabled={!!editingScenario}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 font-mono">
                    Severity
                  </label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 font-mono">
                    Chance of Failure (0-1)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={formProb}
                    onChange={(e) => setFormProb(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 font-mono">
                    Exact Step (opt.)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Step #"
                    value={formStep}
                    onChange={(e) => setFormStep(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 font-mono">
                    Delay (ms)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formDelay}
                    onChange={(e) => setFormDelay(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-xs transition-colors"
                >
                  Save Problem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
