// API Service Layer — connects to TrustTrace backend
// All requests go through this module; no raw fetch() in components.

const DEFAULT_API_URL = 'https://trusttrace-152v.onrender.com';
const envApiUrl = import.meta.env.VITE_API_URL;
// Use explicit VITE_API_URL if provided, else use deployed Render backend URL
const BASE_URL = (envApiUrl || DEFAULT_API_URL).replace(/\/+$/, '');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${BASE_URL}${cleanPath}`;

  const token = typeof window !== 'undefined' ? localStorage.getItem('trusttrace_token') : null;
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options?.headers,
      },
      ...options,
    });
  } catch (err: any) {
    throw new Error(`Could not connect to backend server at ${BASE_URL}. Please ensure the backend is online and reachable.`);
  }

  // Guard against HTML responses (e.g. when frontend routes mistakenly return index.html)
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const textBody = await res.text().catch(() => '');
    if (textBody.trim().startsWith('<') || textBody.includes('<!doctype') || textBody.includes('<html')) {
      throw new Error(`Backend URL configuration error: received HTML instead of JSON from ${url}. Ensure VITE_API_URL points to https://trusttrace-152v.onrender.com`);
    }
    throw new Error(`Unexpected non-JSON response (${res.status}): ${textBody.slice(0, 120)}`);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Health ─────────────────────────────────────────────────────────────────

export const api = {
  health: () => request<import('../types').HealthStatus>('/health'),

  // ─── Authentication ────────────────────────────────────────────────────────
  auth: {
    login: (data: { email: string; password: string }) =>
      request<import('../types').TokenResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    register: (data: { email: string; password: string; name?: string }) =>
      request<import('../types').TokenResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    demo: () =>
      request<import('../types').TokenResponse>('/api/v1/auth/demo', {
        method: 'POST',
      }),
    me: () => request<import('../types').User>('/api/v1/auth/me'),
    logout: () =>
      request<{ status: string; message: string }>('/api/v1/auth/logout', {
        method: 'POST',
      }),
  },

  // ─── Tasks ────────────────────────────────────────────────────────────────
  tasks: {
    list: () => request<import('../types').Task[]>('/api/v1/exports/tasks/list'),
  },

  // ─── Sample Test Cases ─────────────────────────────────────────────────────
  testCases: {
    list: (sampleOnly = false) =>
      request<import('../types').SampleTestCase[]>(`/api/v1/test-cases${sampleOnly ? '?sample_only=true' : ''}`),
    get: (id: string) => request<import('../types').SampleTestCase>(`/api/v1/test-cases/${id}`),
    create: (data: Partial<import('../types').SampleTestCase>) =>
      request<import('../types').SampleTestCase>('/api/v1/test-cases', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<import('../types').SampleTestCase>) =>
      request<import('../types').SampleTestCase>(`/api/v1/test-cases/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    run: (id: string) =>
      request<{
        status: string;
        case_id: string;
        case_name: string;
        expected_recovery: string;
        experiment_id: string;
        result: any;
      }>(`/api/v1/test-cases/${id}/run`, {
        method: 'POST',
      }),
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
    list: (limit = 100, offset = 0) =>
      request<import('../types').ExperimentListItem[]>(`/api/v1/experiments?limit=${limit}&offset=${offset}`),
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
    pdfUrl: (expId: string) => `${BASE_URL}/api/v1/reports/${expId}/pdf`,
  },

  // ─── Evidence ──────────────────────────────────────────────────────────────
  evidence: {
    list: (params?: {
      experiment_id?: string;
      policy_id?: string;
      scenario_id?: string;
      outcome?: string;
      limit?: number;
      offset?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.experiment_id) q.set('experiment_id', params.experiment_id);
      if (params?.policy_id && params.policy_id !== 'all') q.set('policy_id', params.policy_id);
      if (params?.scenario_id && params.scenario_id !== 'all') q.set('scenario_id', params.scenario_id);
      if (params?.outcome && params.outcome !== 'all') q.set('outcome', params.outcome);
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      const qs = q.toString() ? `?${q.toString()}` : '';
      return request<{ total: number; limit: number; offset: number; evidence_items: import('../types').EvidenceSummary[] }>(`/api/v1/evidence${qs}`);
    },
    get: (runId: string) => request<import('../types').RunEvidence>(`/api/v1/evidence/${runId}`),
  },

  // ─── Research Reports & PDF ────────────────────────────────────────────────
  reports: {
    overall: (params?: { experiment_ids?: string; policy_id?: string; scenario_id?: string }) => {
      const q = new URLSearchParams();
      if (params?.experiment_ids) q.set('experiment_ids', params.experiment_ids);
      if (params?.policy_id && params.policy_id !== 'all') q.set('policy_id', params.policy_id);
      if (params?.scenario_id && params.scenario_id !== 'all') q.set('scenario_id', params.scenario_id);
      const qs = q.toString() ? `?${q.toString()}` : '';
      return request<import('../types').OverallReportData>(`/api/v1/reports/overall${qs}`);
    },
    overallPdfUrl: (params?: { experiment_ids?: string; policy_id?: string; scenario_id?: string }) => {
      const q = new URLSearchParams();
      if (params?.experiment_ids) q.set('experiment_ids', params.experiment_ids);
      if (params?.policy_id && params.policy_id !== 'all') q.set('policy_id', params.policy_id);
      if (params?.scenario_id && params.scenario_id !== 'all') q.set('scenario_id', params.scenario_id);
      const qs = q.toString() ? `?${q.toString()}` : '';
      return `${BASE_URL}/api/v1/reports/overall/pdf${qs}`;
    },
    overallMarkdownUrl: (params?: { experiment_ids?: string; policy_id?: string; scenario_id?: string }) => {
      const q = new URLSearchParams();
      if (params?.experiment_ids) q.set('experiment_ids', params.experiment_ids);
      if (params?.policy_id && params.policy_id !== 'all') q.set('policy_id', params.policy_id);
      if (params?.scenario_id && params.scenario_id !== 'all') q.set('scenario_id', params.scenario_id);
      const qs = q.toString() ? `?${q.toString()}` : '';
      return `${BASE_URL}/api/v1/reports/overall/markdown${qs}`;
    },
    experimentPdfUrl: (expId: string) => `${BASE_URL}/api/v1/reports/${expId}/pdf`,
  },
};
