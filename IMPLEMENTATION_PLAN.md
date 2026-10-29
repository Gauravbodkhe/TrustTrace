# TrustTrace — Implementation Plan

## Project: AI Agent Reliability Testing and Recovery Platform

**Date:** 2026-10-29  
**Status:** In Progress

---

## Research Question

> "Can a budget-aware, safety-constrained recovery policy improve task completion for tool-using AI agents without disproportionate increases in latency, API cost, or unsafe recovery decisions?"

---

## Architecture Decisions

### ADR-001: Synchronous experiment runs with streaming status
Rationale: Vercel-hosted frontends cannot hold long-lived SSE connections reliably. We use background task execution (FastAPI BackgroundTasks) with polling endpoints for run status.

### ADR-002: SQLite for local development, Supabase PostgreSQL for production
Rationale: Zero-dependency local dev. SQLite schema is compatible with PostgreSQL. Migration handled via `alembic`.

### ADR-003: Mock-first agent design
Rationale: The entire platform must work without external AI credentials. The mock agent uses deterministic seed-based responses.

### ADR-004: npm (not pnpm) for frontend
Rationale: pnpm not found on this system. npm 11.6.0 with Node 22 is available.

### ADR-005: Fault injection is purely simulated
No real external services are contacted. All tool calls are controlled simulations.

---

## Phase Checklist

### Phase 1 — Inspect and Plan ✅
- [x] Workspace inspection
- [x] Runtime detection (Python 3.11.9, Node 22, npm 11.6)
- [x] Git initialization
- [x] IMPLEMENTATION_PLAN.md

### Phase 2 — Backend Foundation
- [ ] Project structure creation
- [ ] `requirements.txt` and virtual environment
- [ ] FastAPI app skeleton (`main.py`, `config.py`)
- [ ] Pydantic schemas
- [ ] Simulated tools registry
- [ ] Mock agent
- [ ] Health endpoint
- [ ] Database setup (SQLite local)
- [ ] Alembic migrations
- [ ] Backend unit tests (health, tools, mock agent)

### Phase 3 — Fault Injection and Recovery
- [ ] 10 fault scenarios
- [ ] Fault injector service
- [ ] Diagnosis engine (rule-based)
- [ ] 7 recovery policies (A–G)
- [ ] Execution budget enforcement
- [ ] Retry with backoff
- [ ] Trace recording
- [ ] Unit tests for every fault + policy

### Phase 4 — Experiment Management
- [ ] Experiment runner service
- [ ] Batch run support
- [ ] Seeded benchmark dataset (10+ tasks)
- [ ] Metrics engine (10 metrics)
- [ ] CSV + JSON export
- [ ] Repository layer
- [ ] Integration tests

### Phase 5 — Frontend
- [ ] Vite + React + TypeScript scaffold
- [ ] Tailwind CSS
- [ ] React Router
- [ ] API service layer
- [ ] Dashboard page (A)
- [ ] Create Experiment page (B)
- [ ] Experiment Details page (C)
- [ ] Trace Explorer page (D)
- [ ] Policy Comparison page (E)
- [ ] Fault Scenario Library page (F)
- [ ] Research Reports page (G)
- [ ] Settings page (H)
- [ ] Frontend tests (Vitest)

### Phase 6 — Gemini Integration
- [ ] Gemini agent implementation
- [ ] API key management
- [ ] Error handling (rate limit, quota, timeout)
- [ ] Usage metadata recording
- [ ] Mock integration tests

### Phase 7 — Test and Harden
- [ ] Full backend test suite
- [ ] Full frontend test suite
- [ ] Integration test (E2E flow)
- [ ] Production build verification

### Phase 8 — Deployment Preparation
- [ ] `.env.example`
- [ ] Docker / Docker Compose
- [ ] Vercel config
- [ ] Health check documentation

### Phase 9 — Research Deliverables
- [ ] `docs/RESEARCH_METHODOLOGY.md`
- [ ] `docs/ARCHITECTURE.md`
- [ ] `docs/EXPERIMENT_GUIDE.md`
- [ ] `docs/DEPLOYMENT.md`
- [ ] `docs/SECURITY.md`
- [ ] `README.md`
- [ ] Benchmark dataset
- [ ] Sample report

---

## API Contract (Summary)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Backend + DB status |
| GET | `/api/v1/experiments` | List experiments |
| POST | `/api/v1/experiments` | Create experiment |
| GET | `/api/v1/experiments/{id}` | Get experiment details |
| POST | `/api/v1/experiments/{id}/runs` | Start a run |
| GET | `/api/v1/experiments/{id}/runs` | List runs |
| GET | `/api/v1/runs/{run_id}` | Get run details |
| GET | `/api/v1/runs/{run_id}/traces` | Get execution trace |
| GET | `/api/v1/scenarios` | List fault scenarios |
| POST | `/api/v1/scenarios` | Create scenario |
| GET | `/api/v1/scenarios/{id}` | Get scenario |
| PUT | `/api/v1/scenarios/{id}` | Update scenario |
| GET | `/api/v1/metrics` | Aggregate metrics |
| GET | `/api/v1/metrics/comparison` | Policy comparison |
| GET | `/api/v1/exports/{run_id}/csv` | CSV export |
| GET | `/api/v1/exports/{run_id}/json` | JSON export |
| GET | `/api/v1/exports/{exp_id}/report` | Markdown report |
| GET | `/api/v1/tasks` | List benchmark tasks |

---

## Database Schema (SQLite / PostgreSQL compatible)

### experiments
- id (UUID PK)
- name, description
- agent_type (mock | gemini)
- policy_id
- scenario_id
- task_ids (JSON)
- repetitions, seed
- max_retries, timeout_seconds
- token_budget, cost_budget_usd
- status (pending | running | completed | failed)
- created_at, updated_at

### experiment_runs
- id (UUID PK)
- experiment_id (FK)
- task_id
- run_number
- policy_id
- scenario_id
- seed
- status
- outcome (success | failure | partial | unsafe)
- started_at, completed_at, duration_ms
- retry_count
- token_usage, estimated_cost_usd
- error_message
- config_snapshot (JSON)

### execution_traces
- id (UUID PK)
- run_id (FK)
- step_number
- tool_name
- input_data (JSON, redacted)
- output_data (JSON, redacted)
- status (success | failure | skipped)
- fault_injected (bool)
- fault_category
- diagnosis_category
- recovery_action
- retry_number
- started_at, ended_at, latency_ms
- token_usage

### recovery_decisions
- id (UUID PK)
- trace_id (FK)
- run_id (FK)
- policy_id
- decision (retry | fallback | stop | clarify | safe_stop)
- reason
- budget_remaining (JSON)
- outcome (success | failure)
- created_at

### fault_scenarios
- id (VARCHAR PK)
- name, description
- category
- probability, deterministic_step
- failure_delay_ms
- severity
- seed
- is_active

### tasks
- id (VARCHAR PK)
- name, description
- category
- input_data (JSON)
- expected_output (JSON)
- difficulty
- version
- is_benchmark

### metric_summaries
- id (UUID PK)
- experiment_id (FK)
- policy_id
- task_success_rate, recovery_success_rate
- diagnosis_accuracy
- unsafe_recovery_rate
- mean_latency_ms, median_latency_ms, p95_latency_ms
- avg_retry_count
- total_token_usage, estimated_cost_usd
- sample_size
- calculated_at

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| No pnpm available | Use npm instead |
| No FastAPI installed | Install via pip in requirements.txt |
| SQLite not matching Postgres exactly | Use SQLAlchemy ORM with dialect-agnostic queries |
| Gemini API not available | Mock agent is primary; Gemini is optional |
| Long experiment runs blocking API | BackgroundTasks + polling |
| Division by zero in metrics | Guard all denominators with null coalescing |

---

## Technology Versions (Locked)

- Python: 3.11.9
- Node: 22.18.0
- npm: 11.6.0
- FastAPI: 0.115.x
- Pydantic: 2.x
- SQLAlchemy: 2.x
- Alembic: 1.x
- React: 18.x
- TypeScript: 5.x
- Vite: 5.x
- Tailwind: 3.x
- Recharts: 2.x
