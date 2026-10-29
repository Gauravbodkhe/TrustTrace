import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Plus,
  ShieldAlert,
  Clock,
  Sparkles,
  Check,
  Edit2,
  X,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { FaultScenario } from '../types';

export const ScenarioLibrary: React.FC = () => {
  const [scenarios, setScenarios] = useState<FaultScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <ShieldAlert className="h-5 w-5 text-rose-400" />
            <span>Fault Scenario Library</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Standardized catalog of 10 simulated failure modes for reproducible AI agent reliability testing.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors shadow-sm shadow-indigo-600/30"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Fault Scenario</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Safety Notice */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-start space-x-3 text-xs text-slate-400">
        <Info className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
        <p>
          <strong className="text-slate-300">Safety Notice:</strong> All fault scenarios are simulated
          entirely inside TrustTrace's controlled internal runtime. No external network traffic, external APIs,
          or production systems are ever disrupted or attacked.
        </p>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((s) => (
          <div
            key={s.id}
            className="p-5 rounded-xl bg-[#0f1524] border border-slate-800/80 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-slate-200 text-sm">{s.name}</h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                    s.severity === 'high'
                      ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                      : s.severity === 'medium'
                      ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {s.severity}
                </span>
              </div>

              <div className="mt-1 font-mono text-[10px] text-indigo-400 uppercase tracking-wider">
                Category: {s.category}
              </div>

              <p className="mt-2 text-xs text-slate-400 line-clamp-3 leading-relaxed">
                {s.description}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800/60 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Probability: {(s.probability * 100).toFixed(0)}%</span>
                <span>
                  {s.deterministic_step !== null
                    ? `Deterministic (Step ${s.deterministic_step})`
                    : 'Probabilistic'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-mono text-slate-600">ID: {s.id}</span>
                <button
                  onClick={() => openEditModal(s)}
                  className="flex items-center space-x-1 text-xs text-slate-400 hover:text-indigo-300 font-mono"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Configure</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-[#0f1524] border border-slate-800 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white font-sans">
                {editingScenario ? 'Configure Fault Scenario' : 'Create Custom Fault Scenario'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Scenario Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Description / Trigger Conditions</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-mono">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    disabled={!!editingScenario}
                    className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-mono">Severity</label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#090d16] border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-mono">Probability (0-1)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={formProb}
                    onChange={(e) => setFormProb(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#090d16] border border-slate-800 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-mono">Exact Step (optional)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Step #"
                    value={formStep}
                    onChange={(e) => setFormStep(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#090d16] border border-slate-800 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-mono">Delay (ms)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formDelay}
                    onChange={(e) => setFormDelay(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#090d16] border border-slate-800 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm"
                >
                  Save Scenario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
