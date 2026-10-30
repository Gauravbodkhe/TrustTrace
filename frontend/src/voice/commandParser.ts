export type VoiceIntent =
  | 'NAVIGATE_DASHBOARD'
  | 'NAVIGATE_NEW_EXPERIMENT'
  | 'NAVIGATE_EXPERIMENTS'
  | 'NAVIGATE_COMPARISON'
  | 'NAVIGATE_TRACES'
  | 'NAVIGATE_EVIDENCE'
  | 'NAVIGATE_REPORTS'
  | 'NAVIGATE_SETTINGS'
  | 'SELECT_POLICY'
  | 'SELECT_SCENARIO'
  | 'SHOW_LATEST_EXPERIMENT'
  | 'EXPLAIN_FAILURE'
  | 'GENERATE_REPORT'
  | 'SUMMARIZE_RESULTS'
  | 'RUN_BENCHMARK'
  | 'UNKNOWN';

export interface ParsedVoiceCommand {
  rawTranscript: string;
  intent: VoiceIntent;
  confidence: number;
  parameter?: string;
  description: string;
  requiresConfirmation: boolean;
}

export const parseVoiceCommand = (raw: string): ParsedVoiceCommand => {
  const normalized = raw.trim().toLowerCase();

  // 1. "Quick benchmark" / "Run benchmark"
  if (
    normalized.includes('quick benchmark') ||
    normalized.includes('run benchmark') ||
    normalized.includes('run quick benchmark') ||
    normalized.includes('start benchmark') ||
    normalized.includes('execute benchmark')
  ) {
    return {
      rawTranscript: raw,
      intent: 'RUN_BENCHMARK',
      confidence: 0.95,
      description: 'Execute automated benchmark evaluation test',
      requiresConfirmation: false,
    };
  }

  // 2. "Create a new experiment"
  if (
    normalized.includes('create a new experiment') ||
    normalized.includes('new experiment') ||
    normalized.includes('start experiment') ||
    normalized.includes('create experiment')
  ) {
    return {
      rawTranscript: raw,
      intent: 'NAVIGATE_NEW_EXPERIMENT',
      confidence: 0.95,
      description: 'Navigate to New Experiment wizard',
      requiresConfirmation: false,
    };
  }

  // 2. "Compare all recovery policies"
  if (
    normalized.includes('compare all recovery policies') ||
    normalized.includes('compare policies') ||
    normalized.includes('policy comparison') ||
    normalized.includes('compare recovery')
  ) {
    return {
      rawTranscript: raw,
      intent: 'NAVIGATE_COMPARISON',
      confidence: 0.95,
      description: 'Open Policy Comparison Matrix',
      requiresConfirmation: false,
    };
  }

  // 3. "Generate the overall PDF report"
  if (
    normalized.includes('generate the overall pdf report') ||
    normalized.includes('generate overall report') ||
    normalized.includes('download pdf') ||
    normalized.includes('overall pdf') ||
    normalized.includes('generate report')
  ) {
    return {
      rawTranscript: raw,
      intent: 'GENERATE_REPORT',
      confidence: 0.95,
      description: 'Open Reports page and download overall PDF',
      requiresConfirmation: false,
    };
  }

  // 4. "Summarize the experimental results"
  if (
    normalized.includes('summarize the experimental results') ||
    normalized.includes('summarize results') ||
    normalized.includes('summarize findings') ||
    normalized.includes('what are the findings')
  ) {
    return {
      rawTranscript: raw,
      intent: 'SUMMARIZE_RESULTS',
      confidence: 0.9,
      description: 'Provide spoken and visual summary of experimental findings',
      requiresConfirmation: false,
    };
  }

  // 5. "Explain why this run failed"
  if (
    normalized.includes('explain why this run failed') ||
    normalized.includes('why did it fail') ||
    normalized.includes('explain failure') ||
    normalized.includes('show evidence') ||
    normalized.includes('view evidence')
  ) {
    return {
      rawTranscript: raw,
      intent: 'EXPLAIN_FAILURE',
      confidence: 0.92,
      description: 'Open Evidence Explorer to inspect root cause and recovery steps',
      requiresConfirmation: false,
    };
  }

  // 6. "Show the latest experiment"
  if (
    normalized.includes('show the latest experiment') ||
    normalized.includes('latest experiment') ||
    normalized.includes('open latest run')
  ) {
    return {
      rawTranscript: raw,
      intent: 'SHOW_LATEST_EXPERIMENT',
      confidence: 0.9,
      description: 'Open the most recently executed experiment details',
      requiresConfirmation: false,
    };
  }

  // 7. "Select the bounded retry policy" / "Select Policy ..."
  if (
    normalized.includes('select policy') ||
    normalized.includes('select the') ||
    normalized.includes('choose policy')
  ) {
    let policyKey = 'policy_g_budget_aware';
    let policyName = 'Policy G (Budget-Aware Multi-Strategy)';

    if (normalized.includes('bounded retry') || normalized.includes('policy b')) {
      policyKey = 'policy_b_bounded_retry';
      policyName = 'Policy B (Bounded Retry)';
    } else if (normalized.includes('exponential backoff') || normalized.includes('backoff') || normalized.includes('policy c')) {
      policyKey = 'policy_c_validation_retry';
      policyName = 'Policy C (Validation & Retry)';
    } else if (normalized.includes('fallback') || normalized.includes('policy d')) {
      policyKey = 'policy_d_fallback';
      policyName = 'Policy D (Fallback)';
    } else if (normalized.includes('safe stop') || normalized.includes('policy e')) {
      policyKey = 'policy_e_safe_stop';
      policyName = 'Policy E (Safe Stop)';
    } else if (normalized.includes('clarification') || normalized.includes('human') || normalized.includes('policy f')) {
      policyKey = 'policy_f_clarification';
      policyName = 'Policy F (Clarification)';
    } else if (normalized.includes('no recovery') || normalized.includes('baseline stop') || normalized.includes('policy a')) {
      policyKey = 'policy_a_baseline_stop';
      policyName = 'Policy A (Baseline Stop)';
    }

    return {
      rawTranscript: raw,
      intent: 'SELECT_POLICY',
      confidence: 0.88,
      parameter: policyKey,
      description: `Select recovery strategy: ${policyName}`,
      requiresConfirmation: false,
    };
  }

  // 8. "Choose the timeout fault scenario"
  if (
    normalized.includes('choose') && (normalized.includes('scenario') || normalized.includes('fault')) ||
    normalized.includes('select scenario')
  ) {
    let scenarioKey = 'transient_error_step1';
    let scenarioName = 'Transient Error at Step 1';

    if (normalized.includes('timeout')) {
      scenarioKey = 'timeout_step1';
      scenarioName = 'Timeout at Step 1';
    } else if (normalized.includes('unavailable') || normalized.includes('tool missing')) {
      scenarioKey = 'tool_unavailable_step2';
      scenarioName = 'Tool Unavailable at Step 2';
    } else if (normalized.includes('malformed') || normalized.includes('json')) {
      scenarioKey = 'malformed_json_step1';
      scenarioName = 'Malformed JSON at Step 1';
    } else if (normalized.includes('rate limit')) {
      scenarioKey = 'rate_limit_step1';
      scenarioName = 'Rate Limit at Step 1';
    } else if (normalized.includes('no fault') || normalized.includes('baseline')) {
      scenarioKey = 'no_fault';
      scenarioName = 'No Fault (Baseline)';
    }

    return {
      rawTranscript: raw,
      intent: 'SELECT_SCENARIO',
      confidence: 0.88,
      parameter: scenarioKey,
      description: `Select fault scenario: ${scenarioName}`,
      requiresConfirmation: false,
    };
  }

  // Navigation direct checks
  if (normalized.includes('dashboard') || normalized.includes('home')) {
    return {
      rawTranscript: raw,
      intent: 'NAVIGATE_DASHBOARD',
      confidence: 0.9,
      description: 'Navigate to Dashboard',
      requiresConfirmation: false,
    };
  }
  if (normalized.includes('experiments') || normalized.includes('experiment list')) {
    return {
      rawTranscript: raw,
      intent: 'NAVIGATE_EXPERIMENTS',
      confidence: 0.9,
      description: 'Navigate to Experiments List',
      requiresConfirmation: false,
    };
  }
  if (normalized.includes('trace') || normalized.includes('timeline')) {
    return {
      rawTranscript: raw,
      intent: 'NAVIGATE_TRACES',
      confidence: 0.9,
      description: 'Navigate to Trace Explorer',
      requiresConfirmation: false,
    };
  }
  if (normalized.includes('evidence')) {
    return {
      rawTranscript: raw,
      intent: 'NAVIGATE_EVIDENCE',
      confidence: 0.9,
      description: 'Navigate to Evidence Panel',
      requiresConfirmation: false,
    };
  }
  if (normalized.includes('report') || normalized.includes('export')) {
    return {
      rawTranscript: raw,
      intent: 'NAVIGATE_REPORTS',
      confidence: 0.9,
      description: 'Navigate to Research Reports',
      requiresConfirmation: false,
    };
  }
  if (normalized.includes('settings')) {
    return {
      rawTranscript: raw,
      intent: 'NAVIGATE_SETTINGS',
      confidence: 0.9,
      description: 'Navigate to Platform Settings',
      requiresConfirmation: false,
    };
  }

  return {
    rawTranscript: raw,
    intent: 'UNKNOWN',
    confidence: 0.2,
    description: `Unrecognized command: "${raw}". Speak a navigation command or click an action.`,
    requiresConfirmation: false,
  };
};
