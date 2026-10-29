# TrustTrace — Remaining Work & Enhancement Roadmap

**Audit Date:** 2026-10-29T19:24:00+05:30  
**Status Overview:** All core platform features (P0 and P1) required for offline experimentation, benchmark reproduction, final-year CSE demonstration, and paper writing are fully implemented and passing tests. The items below represent external integrations, production cloud deployments, and long-term research extensions.

---

## Priority Classification
- **P0 (Critical):** Core system crash, data corruption, broken experiment execution. *(0 remaining)*
- **P1 (High):** Missing core benchmarking capability, incorrect metrics, broken policy recovery. *(0 remaining)*
- **P2 (Medium):** External cloud service integrations, live API telemetry, production hosting setup.
- **P3 (Low):** UI polish, additional benchmark tasks, optional performance micro-optimizations.

---

## Remaining Work Items

### 1. Live Gemini AI Provider Integration (Cloud Key Required)
- **Priority:** **P2 (Medium)**
- **Modules Involved:** [`backend/app/agents/gemini_agent.py`](file:///D:/TrustTrace/backend/app/agents/gemini_agent.py), [`backend/app/core/config.py`](file:///D:/TrustTrace/backend/app/core/config.py)
- **Description:** The `GeminiAgent` is implemented using `google-generativeai` and functions in hybrid fallback mode. When an active `GEMINI_API_KEY` is provided in `.env`, the agent invokes Gemini 1.5 Flash to generate dynamic tool-calling plans rather than using deterministic plans.
- **Dependencies:** Google Gemini API Key (user-provided).
- **Recommended Action:**
  1. Add `GEMINI_API_KEY` to `backend/.env`.
  2. Implement an automated integration test that verifies live model responses with network timeout handling.
  3. Map live token usage headers to estimated USD cost figures based on official Gemini pricing tiers ($0.075 / 1M input tokens, $0.30 / 1M output tokens).
- **Verification Criteria:** `GET /health` reports `gemini_available: True`, and experiment runs with `agent_type='gemini'` record live token usage.
- **Estimated Effort (Estimate):** 2–3 hours.

---

### 2. Supabase Cloud PostgreSQL Migration for Production
- **Priority:** **P2 (Medium)**
- **Modules Involved:** [`backend/app/db/__init__.py`](file:///D:/TrustTrace/backend/app/db/__init__.py), [`backend/app/db/migrations/`](file:///D:/TrustTrace/backend/app/db/migrations/), [`docs/DEPLOYMENT.md`](file:///D:/TrustTrace/docs/DEPLOYMENT.md)
- **Description:** The platform currently runs in local development mode using synchronous SQLite with WAL journaling and busy timeout handling. For multi-tenant production hosting, Supabase PostgreSQL with SSL connection pooling is recommended.
- **Dependencies:** Supabase project URL and database password.
- **Recommended Action:**
  1. Generate standalone Alembic or SQL migration scripts in `backend/app/db/migrations/` defining foreign keys, indexes, and constraints.
  2. Test connecting to a live Supabase PostgreSQL instance via `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`.
  3. Verify that all 7 ORM models and relationships migrate cleanly.
- **Verification Criteria:** `pytest tests/test_backend.py` passes against a PostgreSQL connection string.
- **Estimated Effort (Estimate):** 2–4 hours.

---

### 3. Background Asynchronous Experiment Worker Queue
- **Priority:** **P2 (Medium)**
- **Modules Involved:** [`backend/app/api/routes/experiments.py`](file:///D:/TrustTrace/backend/app/api/routes/experiments.py), [`backend/app/services/experiment_runner.py`](file:///D:/TrustTrace/backend/app/services/experiment_runner.py)
- **Description:** Small experiments (1–10 runs) execute within 100ms–2s and return synchronously over HTTP. For massive benchmark suites (e.g. 100 repetitions × 10 tasks = 1000 runs for scientific statistical significance), executions should be dispatched to FastAPI `BackgroundTasks` or a background task queue (such as Celery/Redis or ARQ).
- **Dependencies:** Optional Redis server (if using Celery/ARQ), or native FastAPI `BackgroundTasks`.
- **Recommended Action:**
  1. Update `POST /api/v1/experiments/{id}/run` to accept an optional `async_mode=true` query parameter.
  2. When enabled, dispatch `runner.run_experiment(exp_id)` to `BackgroundTasks` and return HTTP 202 Accepted immediately.
  3. The frontend can poll `GET /api/v1/experiments/{id}` until `status == 'completed'`.
- **Verification Criteria:** Triggering a 50-repetition experiment returns 202 immediately, status transitions from `running` to `completed`, and metrics are persisted upon finish.
- **Estimated Effort (Estimate):** 3–4 hours.

---

### 4. Expansion of Benchmark Task Catalog
- **Priority:** **P3 (Low)**
- **Modules Involved:** [`backend/app/db/benchmark_data.py`](file:///D:/TrustTrace/backend/app/db/benchmark_data.py)
- **Description:** TrustTrace currently seeds 11 standard benchmark tasks across 5 categories (knowledge retrieval, record lookups, data validation, calculation, and answer synthesis). Adding 10–15 more domain-specific tasks (e.g. multi-step financial reconciliation, incident triage, CRM sync) will enhance empirical diversity for publication benchmarks.
- **Dependencies:** None.
- **Recommended Action:**
  1. Define 10 new tasks in `BENCHMARK_TASKS` in `benchmark_data.py`.
  2. Include explicit expected outputs and validation schemas for each task.
- **Verification Criteria:** `repo.seed_benchmark_tasks()` inserts the new tasks and they appear in the Create Experiment task selector.
- **Estimated Effort (Estimate):** 2 hours.

---

### 5. Frontend Bundle Code-Splitting
- **Priority:** **P3 (Low)**
- **Modules Involved:** [`frontend/src/App.tsx`](file:///D:/TrustTrace/frontend/src/App.tsx), [`frontend/vite.config.ts`](file:///D:/TrustTrace/frontend/vite.config.ts)
- **Description:** The production bundle currently compiles into a single JavaScript chunk of ~785 kB (220 kB gzipped). Vite emits a minor bundle size notice recommending dynamic `import()` for lazy route loading.
- **Dependencies:** React `Suspense` and `lazy()`.
- **Recommended Action:**
  1. Convert page imports in `App.tsx` to `React.lazy(() => import('./pages/...'))`.
  2. Wrap route rendering in `<Suspense fallback={<LoadingSpinner />}>`.
  3. Verify chunking splits Recharts into its own vendor chunk.
- **Verification Criteria:** Vite build output splits into smaller sub-chunks under 500 kB.
- **Estimated Effort (Estimate):** 1 hour.
