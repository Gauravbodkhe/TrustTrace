// TrustTrace Frontend Type Definitions

export interface HealthStatus {
  status: string;
  version: string;
  database: string;
  db_type?: string;
  gemini_available: boolean;
  mock_mode: boolean;
  timestamp: string;
}

export interface SampleTestCase {
  id: string;
  name: string;
  description: string;
  fault_category: string;
  scenario_id: string;
  expected_recovery: string;
  recommended_policy_id: string;
  task_ids: string[];
  default_params: {
    repetitions?: number;
    seed?: number;
    max_retries?: number;
    timeout_seconds?: number;
    token_budget?: number | null;
    cost_budget_usd?: number | null;
    [key: string]: any;
  };
  is_sample: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  is_benchmark: boolean;
  version: string;
}

export interface FaultScenario {
  id: string;
  name: string;
  description: string;
  category: string;
  probability: number;
  deterministic_step: number | null;
  failure_delay_ms: number;
  severity: string;
  seed: number | null;
  is_active: boolean;
}

export interface RecoveryPolicy {
  id: string;
  name: string;
  description: string;
}

export interface ExperimentCreate {
  name: string;
  description: string;
  agent_type: 'mock' | 'gemini';
  policy_id: string;
  scenario_id: string;
  task_ids: string[];
  repetitions: number;
  seed: number;
  max_retries: number;
  timeout_seconds: number;
  token_budget: number | null;
  cost_budget_usd: number | null;
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  agent_type: string;
  policy_id: string;
  scenario_id: string;
  task_ids: string[];
  repetitions: number;
  seed: number;
  max_retries: number;
  timeout_seconds: number;
  token_budget: number | null;
  cost_budget_usd: number | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface ExperimentListItem {
  id: string;
  name: string;
  agent_type: string;
  policy_id: string;
  scenario_id: string;
  status: string;
  repetitions: number;
  created_at: string;
}

export interface Run {
  id: string;
  experiment_id: string;
  task_id: string;
  run_number: number;
  policy_id: string;
  scenario_id: string;
  seed: number;
  status: string;
  outcome: 'success' | 'failure' | 'partial' | 'unsafe' | 'clarification_needed' | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  retry_count: number;
  token_usage: number | null;
  estimated_cost_usd: number | null;
  error_message: string | null;
}

export interface TraceStep {
  id: string;
  run_id: string;
  step_number: number;
  tool_name: string;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown> | null;
  status: string;
  fault_injected: boolean;
  fault_category: string | null;
  diagnosis_category: string | null;
  recovery_action: string | null;
  retry_number: number;
  started_at: string;
  ended_at: string | null;
  latency_ms: number | null;
  token_usage: number | null;
}

export interface RecoveryDecision {
  id: string;
  trace_id: string | null;
  run_id: string;
  policy_id: string;
  decision: string;
  reason: string;
  budget_remaining: Record<string, unknown> | null;
  outcome: string | null;
  created_at: string;
}

export interface MetricSummary {
  id: string;
  experiment_id: string;
  policy_id: string;
  task_success_rate: number | null;
  recovery_success_rate: number | null;
  diagnosis_accuracy: number | null;
  unsafe_recovery_rate: number | null;
  mean_latency_ms: number | null;
  median_latency_ms: number | null;
  p95_latency_ms: number | null;
  avg_retry_count: number | null;
  total_token_usage: number | null;
  estimated_cost_usd: number | null;
  sample_size: number;
  calculated_at: string;
}

export interface DashboardStats {
  total_experiments: number;
  completed_experiments?: number;
  total_sample_cases?: number;
  total_runs: number;
  task_success_rate: number | null;
  recovery_success_rate: number | null;
  avg_latency_ms: number | null;
  outcome_distribution: Record<string, number>;
  recent_experiments: Array<{
    id: string;
    name: string;
    status: string;
    policy_id: string;
    scenario_id: string;
    created_at: string;
  }>;
  most_common_failures?: Array<{
    category: string;
    count: number;
    recovery_rate: number;
    description?: string;
    total_failures?: number;
    recovered_failures?: number;
  }>;
  best_policy?: {
    policy_id: string;
    policy_name: string;
    sample_size: number;
    task_success_rate: number | null;
    recovery_success_rate?: number | null;
    metric_description?: string;
  } | null;
}

export interface PolicyComparisonRow {
  policy_id: string;
  policy_name: string;
  sample_size: number;
  task_success_rate: number | null;
  recovery_success_rate: number | null;
  unsafe_recovery_rate: number | null;
  mean_latency_ms: number | null;
  avg_retry_count: number | null;
  estimated_cost_usd: number | null;
}

export interface PolicyComparisonResponse {
  policies: PolicyComparisonRow[];
  note: string;
}

export interface EvidenceSummary {
  run_id: string;
  experiment_id: string;
  task_id: string;
  run_number: number;
  policy_id: string;
  scenario_id: string;
  seed: number;
  outcome: string;
  duration_ms: number | null;
  retry_count: number;
  total_steps: number;
  fault_injected: boolean;
  fault_category: string | null;
  diagnosed_category: string | null;
  diagnosis_correct: boolean | null;
  recovery_action: string | null;
  has_traces: boolean;
  started_at: string | null;
}

export interface RunEvidence {
  run_id: string;
  experiment_id: string;
  experiment_name: string;
  task_id: string;
  policy_id: string;
  scenario_id: string;
  seed: number;
  agent_type: string;
  started_at: string | null;
  completed_at: string | null;
  observed_evidence: Array<{
    step_number: number;
    retry_number: number;
    trace_id: string;
    tool_name: string;
    started_at: string | null;
    ended_at: string | null;
    latency_ms: number | null;
    token_usage: number | null;
    status: string;
    fault_injected: boolean;
    fault_category: string | null;
    diagnosis_category: string | null;
    recovery_action: string | null;
    sanitized_inputs: Record<string, unknown> | null;
    sanitized_outputs: Record<string, unknown> | null;
  }>;
  calculated_metrics: {
    total_execution_steps: number;
    wall_clock_duration_ms: number | null;
    retries_used: number;
    max_retries_configured: number;
    retry_budget_consumed_pct: number;
    token_usage: number | null;
    token_budget_configured: number | null;
    token_budget_consumed_pct: number | null;
    actual_cost_usd: number | null;
    terminal_outcome: string;
  };
  rule_based_diagnosis: {
    ground_truth_fault: string;
    diagnosed_fault: string;
    diagnosis_correct: boolean | null;
    recovery_decisions: Array<{
      decision_id: string;
      trace_id: string | null;
      policy_id: string;
      action: string;
      reason: string;
      budget_remaining: Record<string, unknown> | null;
      timestamp: string | null;
    }>;
  };
  ai_explanation: {
    summary: string;
    root_cause_analysis: string;
    recovery_assessment: string;
    recommended_next_step: string;
    supporting_evidence_citations: string[];
    disclaimer: string;
  };
  missing_evidence: Array<{
    field: string;
    reason: string;
  }>;
  integrity_status: string;
}

export interface OverallReportData {
  title: string;
  subtitle: string;
  scope: string;
  total_experiments: number;
  total_runs: number;
  overall_success_rate: number;
  best_policy_summary: string;
  policy_comparison: Array<{
    policy_id: string;
    policy_name: string;
    sample_size: number;
    task_success_rate: number | null;
    recovery_success_rate: number | null;
    mean_latency_ms: number | null;
    avg_retry_count: number | null;
  }>;
  failure_distribution: Array<{
    category: string;
    description: string;
    count: number;
    unique_runs: number;
    recovered_runs: number;
    recovery_rate: number;
  }>;
  recent_traces: Array<{
    step_number: number;
    tool_name: string;
    status: string;
    fault_category: string | null;
    diagnosis_category: string | null;
    recovery_action: string | null;
    latency_ms: number | null;
  }>;
}
