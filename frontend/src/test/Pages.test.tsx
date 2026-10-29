import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CreateExperiment } from '../pages/CreateExperiment';
import { PolicyComparison } from '../pages/PolicyComparison';
import { ScenarioLibrary } from '../pages/ScenarioLibrary';
import { Evidence } from '../pages/Evidence';
import { ResearchReports } from '../pages/ResearchReports';
import { Settings } from '../pages/Settings';

vi.mock('../services/api', () => ({
  api: {
    health: vi.fn().mockResolvedValue({
      status: 'ok',
      version: '0.1.0',
      database: 'ok',
      gemini_available: false,
      mock_mode: true,
      timestamp: new Date().toISOString(),
    }),
    tasks: {
      list: vi.fn().mockResolvedValue([
        {
          id: 'task_expense_policy',
          name: 'Expense Policy Lookup',
          description: 'Lookup expense limits',
          category: 'knowledge_retrieval',
          difficulty: 'easy',
          is_benchmark: true,
          version: '1.0',
        },
      ]),
    },
    scenarios: {
      list: vi.fn().mockResolvedValue([
        {
          id: 'transient_error_step1',
          name: 'Transient Error at Step 1',
          description: 'HTTP 503 at step 1',
          category: 'transient_error',
          probability: 1.0,
          deterministic_step: 1,
          failure_delay_ms: 0,
          severity: 'medium',
          seed: 1008,
          is_active: true,
        },
      ]),
      listPolicies: vi.fn().mockResolvedValue([
        {
          id: 'policy_g_budget_aware',
          name: 'Policy G: Budget-Aware Recovery',
          description: 'Configurable recovery strategy considering budgets',
        },
      ]),
    },
    experiments: {
      list: vi.fn().mockResolvedValue([
        {
          id: 'exp-1',
          name: 'Baseline Evaluation',
          agent_type: 'mock',
          policy_id: 'policy_g_budget_aware',
          scenario_id: 'transient_error_step1',
          status: 'completed',
          repetitions: 1,
          created_at: new Date().toISOString(),
        },
      ]),
      get: vi.fn().mockResolvedValue({
        id: 'exp-1',
        name: 'Baseline Evaluation',
        description: 'Test run',
        agent_type: 'mock',
        policy_id: 'policy_g_budget_aware',
        scenario_id: 'transient_error_step1',
        task_ids: ['task_expense_policy'],
        repetitions: 1,
        seed: 42,
        max_retries: 3,
        timeout_seconds: 30,
        token_budget: null,
        cost_budget_usd: null,
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
      create: vi.fn(),
      run: vi.fn(),
      listRuns: vi.fn().mockResolvedValue([]),
      getMetrics: vi.fn().mockResolvedValue([
        {
          id: 'm-1',
          experiment_id: 'exp-1',
          policy_id: 'policy_g_budget_aware',
          task_success_rate: 1.0,
          recovery_success_rate: 1.0,
          diagnosis_accuracy: 1.0,
          unsafe_recovery_rate: 0.0,
          mean_latency_ms: 95.0,
          median_latency_ms: 95.0,
          p95_latency_ms: null,
          avg_retry_count: 1.0,
          total_token_usage: 120,
          estimated_cost_usd: null,
          sample_size: 1,
          calculated_at: new Date().toISOString(),
        },
      ]),
    },
    runs: {
      get: vi.fn(),
      traces: vi.fn().mockResolvedValue([]),
      decisions: vi.fn().mockResolvedValue([]),
    },
    metrics: {
      dashboard: vi.fn().mockResolvedValue({
        total_experiments: 1,
        total_runs: 1,
        task_success_rate: 1.0,
        avg_latency_ms: 95.0,
        outcome_distribution: { success: 1 },
        recent_experiments: [],
      }),
      comparison: vi.fn().mockResolvedValue({
        policies: [
          {
            policy_id: 'policy_g_budget_aware',
            policy_name: 'Policy G: Budget-Aware Recovery',
            sample_size: 1,
            task_success_rate: 1.0,
            recovery_success_rate: 1.0,
            unsafe_recovery_rate: 0.0,
            mean_latency_ms: 95.0,
            avg_retry_count: 1.0,
            estimated_cost_usd: null,
          },
        ],
        note: 'Computed from recorded runs',
      }),
    },
    exports: {
      csvUrl: vi.fn().mockReturnValue('/api/v1/exports/exp-1/csv'),
      jsonUrl: vi.fn().mockReturnValue('/api/v1/exports/exp-1/json'),
      reportUrl: vi.fn().mockReturnValue('/api/v1/exports/exp-1/report'),
    },
    evidence: {
      list: vi.fn().mockResolvedValue({ evidence_items: [] }),
      get: vi.fn().mockResolvedValue(null),
    },
    reports: {
      overall: vi.fn().mockResolvedValue({
        title: 'TrustTrace Overall Research Benchmark Report',
        subtitle: 'Evaluation of Agent Recovery Strategies under Injected Tool Faults',
        scope: 'All Completed Experiments',
        total_experiments: 1,
        total_runs: 1,
        overall_success_rate: 1.0,
        best_policy_summary: 'Policy G achieved highest success rate.',
        policy_comparison: [],
        failure_distribution: [],
        recent_traces: [],
      }),
      overallPdfUrl: vi.fn().mockReturnValue('/api/v1/reports/overall/pdf'),
      overallMarkdownUrl: vi.fn().mockReturnValue('/api/v1/reports/overall/markdown'),
      experimentPdfUrl: vi.fn().mockReturnValue('/api/v1/reports/exp-1/pdf'),
    },
  },
}));

describe('TrustTrace Pages Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders CreateExperiment page with form controls', async () => {
    render(
      <MemoryRouter>
        <CreateExperiment />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getAllByText('New Experiment')[0]).toBeInTheDocument();
      expect(screen.getByText('Step 1: Experiment Details')).toBeInTheDocument();
      expect(screen.getByText('Continue to Step 2')).toBeInTheDocument();
    });
  });

  it('renders PolicyComparison page with policy rows', async () => {
    render(
      <MemoryRouter>
        <PolicyComparison />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Policy Comparison')).toBeInTheDocument();
      expect(screen.getByText('Policy Comparison Matrix')).toBeInTheDocument();
      expect(screen.getByText('Run Comparison Experiment')).toBeInTheDocument();
    });
  });

  it('renders ScenarioLibrary page with scenarios', async () => {
    render(
      <MemoryRouter>
        <ScenarioLibrary />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Fault Scenarios')).toBeInTheDocument();
      expect(screen.getByText('Transient Error at Step 1')).toBeInTheDocument();
    });
  });

  it('renders Evidence page with audit header and tabs', async () => {
    render(
      <MemoryRouter>
        <Evidence />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Evidence & Explainable Results')).toBeInTheDocument();
      expect(screen.getByText('Sensitive Data & API Keys Redacted')).toBeInTheDocument();
    });
  });

  it('renders ResearchReports page with export actions', async () => {
    render(
      <MemoryRouter>
        <ResearchReports />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Research Reports & Vector PDF Export')).toBeInTheDocument();
      expect(screen.getByText('Generate Complete Overall Report')).toBeInTheDocument();
      expect(screen.getByText('Download Vector PDF')).toBeInTheDocument();
    });
  });

  it('renders Settings page with system readiness checklist', async () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Platform Status & Configuration')).toBeInTheDocument();
      expect(screen.getByText('System Readiness Checklist')).toBeInTheDocument();
      expect(screen.getByText('Python 3.11 Runtime & AsyncIO Engine')).toBeInTheDocument();
    });
  });
});
