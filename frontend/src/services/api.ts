// API Service Layer — connects to TrustTrace backend
// All requests go through this module; no raw fetch() in components.

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Health ─────────────────────────────────────────────────────────────────

export const api = {
  health: () => request<import('../types').HealthStatus>('/health'),

  // ─── Tasks ────────────────────────────────────────────────────────────────
  tasks: {
    list: () => request<import('../types').Task[]>('/api/v1/exports/tasks/list'),
  },

  // ─── Scenarios ────────────────────────────────────────────────────────────
  scenarios: {
    list: () => request<import('../types').FaultScenario[]>('/api/v1/scenarios'),
    get: (id: string) => request<import('../types').FaultScenario>(`/api/v1/scenarios/${id}`),
    create: (data: Partial<import('../types').FaultScenario>) =>
      request<import('../types').FaultScenario>('/api/v1/scenarios', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<import('../types').FaultScenario>) =>
      request<import('../types').FaultScenario>(`/api/v1/scenarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    listPolicies: () =>
      request<import('../types').RecoveryPolicy[]>('/api/v1/scenarios/policies/list'),
  },

  // ─── Experiments ──────────────────────────────────────────────────────────
  experiments: {
    list: () => request<import('../types').ExperimentListItem[]>('/api/v1/experiments'),
    get: (id: string) => request<import('../types').Experiment>(`/api/v1/experiments/${id}`),
    create: (data: import('../types').ExperimentCreate) =>
      request<import('../types').Experiment>('/api/v1/experiments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    run: (id: string) => request<Record<string, unknown>>(`/api/v1/experiments/${id}/run`, {
      method: 'POST',
    }),
    listRuns: (id: string) => request<import('../types').Run[]>(`/api/v1/experiments/${id}/runs`),
    getMetrics: (id: string) =>
      request<import('../types').MetricSummary[]>(`/api/v1/experiments/${id}/metrics`),
  },

  // ─── Runs ─────────────────────────────────────────────────────────────────
  runs: {
    get: (id: string) => request<import('../types').Run>(`/api/v1/runs/${id}`),
    traces: (id: string) => request<import('../types').TraceStep[]>(`/api/v1/runs/${id}/traces`),
    decisions: (id: string) =>
      request<import('../types').RecoveryDecision[]>(`/api/v1/runs/${id}/decisions`),
  },

  // ─── Metrics ──────────────────────────────────────────────────────────────
  metrics: {
    dashboard: () => request<import('../types').DashboardStats>('/api/v1/metrics/dashboard'),
    comparison: (experimentIds?: string[]) => {
      const qs = experimentIds?.length
        ? `?experiment_ids=${experimentIds.join(',')}`
        : '';
      return request<import('../types').PolicyComparisonResponse>(`/api/v1/metrics/comparison${qs}`);
    },
  },

  // ─── Exports ──────────────────────────────────────────────────────────────
  exports: {
    csvUrl: (expId: string) => `${BASE_URL}/api/v1/exports/${expId}/csv`,
    jsonUrl: (expId: string) => `${BASE_URL}/api/v1/exports/${expId}/json`,
    reportUrl: (expId: string) => `${BASE_URL}/api/v1/exports/${expId}/report`,
  },
};
