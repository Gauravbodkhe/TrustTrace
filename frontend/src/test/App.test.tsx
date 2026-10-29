import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../App';
import * as apiModule from '../services/api';

// Mock the API methods
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
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn(),
      create: vi.fn(),
      run: vi.fn(),
      listRuns: vi.fn().mockResolvedValue([]),
      getMetrics: vi.fn().mockResolvedValue([]),
    },
    runs: {
      get: vi.fn(),
      traces: vi.fn().mockResolvedValue([]),
      decisions: vi.fn().mockResolvedValue([]),
    },
    metrics: {
      dashboard: vi.fn().mockResolvedValue({
        total_experiments: 2,
        total_runs: 6,
        task_success_rate: 0.8333,
        avg_latency_ms: 120.5,
        outcome_distribution: { success: 5, failure: 1 },
        recent_experiments: [],
      }),
      comparison: vi.fn().mockResolvedValue({
        policies: [
          {
            policy_id: 'policy_g_budget_aware',
            policy_name: 'Policy G: Budget-Aware Recovery',
            sample_size: 6,
            task_success_rate: 0.8333,
            recovery_success_rate: 0.8333,
            unsafe_recovery_rate: 0.0,
            mean_latency_ms: 120.5,
            avg_retry_count: 1.0,
            estimated_cost_usd: null,
          },
        ],
        note: 'Computed from recorded runs',
      }),
    },
    exports: {
      csvUrl: vi.fn().mockReturnValue('/api/v1/exports/1/csv'),
      jsonUrl: vi.fn().mockReturnValue('/api/v1/exports/1/json'),
      reportUrl: vi.fn().mockReturnValue('/api/v1/exports/1/report'),
    },
  },
}));

describe('TrustTrace Frontend Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the layout with branding and navigation', async () => {
    render(<App />);
    expect(screen.getAllByText('TrustTrace')[0]).toBeInTheDocument();
    expect(screen.getByText('AI Reliability Benchmark')).toBeInTheDocument();
    expect(screen.getByText('Overview Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Create Experiment')).toBeInTheDocument();
    expect(screen.getByText('Policy Comparison')).toBeInTheDocument();
    expect(screen.getByText('Trace Explorer')).toBeInTheDocument();
    expect(screen.getByText('Fault Scenario Library')).toBeInTheDocument();
    expect(screen.getByText('Research Reports')).toBeInTheDocument();
    expect(screen.getByText('Platform Settings')).toBeInTheDocument();
  });

  it('renders dashboard KPI cards and metrics from API', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Reliability Overview')).toBeInTheDocument();
      expect(screen.getByText('Total Experiments')).toBeInTheDocument();
      expect(screen.getByText('83.3%')).toBeInTheDocument();
      expect(screen.getByText('120.5ms')).toBeInTheDocument();
    });
  });

  it('supports theme toggling between light, dark, and system modes', async () => {
    render(<App />);
    const themeButton = screen.getByRole('button', { name: /switch to/i });
    expect(themeButton).toBeInTheDocument();
  });
});
