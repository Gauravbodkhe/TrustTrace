# TrustTrace — Agent & System Architecture Reference

Welcome to the internal engineering and architectural reference for **TrustTrace**. This document provides autonomous coding agents, LLM tool callers, and human researchers with complete context on the codebase structure, database models, recovery algorithms, API routes, and operational guidelines.

---

## 1. System Mission & Core Principles

TrustTrace is an open-source benchmarking and evaluation harness for AI Agent tool reliability, fault injection, and recovery resilience.

### Ground Rules & Non-Negotiables:
1. **Zero Fabricated Statistics**: All completion rates, recovery metrics, latency percentiles, and retry counts originate from actual database records (`runs`, `traces`, `recovery_decisions`). No mock random numbers or fake dashboard counters are permitted.
2. **Dual-Engine Persistence**:
   - **Local Development**: SQLite in WAL mode (`trusttrace.db`).
   - **Production (Render / Cloud)**: Supabase PostgreSQL via `DATABASE_URL`.
   - Never drop or recreate tables on startup (`Base.metadata.create_all()` with dynamic column migration).
3. **Deterministic & Cloud Hybrid Execution**:
   - Fast simulation mode (`mock` agent type): 100% free, reproducible, and zero-cost for benchmarking error handling.
   - Cloud AI mode (`gemini` agent type): Calls Google Gemini Flash via `google-genai` SDK when `GEMINI_API_KEY` is present.
4. **Data Redaction & Security**:
   - Sensitive credentials (`Authorization: Bearer`, `API keys`, passwords) are redacted prior to storage in traces or log output.
   - User passwords stored using salted PBKDF2-HMAC-SHA256 (zero external C-library dependency).

---

## 2. Repository Map

```
d:\TrustTrace\
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI entry point, lifespan, CORS, route registry
│   │   ├── core/
│   │   │   ├── config.py               # Pydantic v2 settings (env, URLs, keys)
│   │   │   └── logging.py              # Redacting logging formatter & filter
│   │   ├── db/
│   │   │   ├── __init__.py             # SQLAlchemy engine (SQLite / PostgreSQL), SessionLocal
│   │   │   └── repository.py           # DB operations, stats aggregations, user & sample case seeds
│   │   ├── models/
│   │   │   └── __init__.py             # SQLAlchemy models (Experiment, Run, TraceStep, User, etc.)
│   │   ├── schemas/
│   │   │   └── __init__.py             # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── fault_injector.py       # Fault categories, probabilistic & deterministic injection
│   │   │   ├── diagnosis_engine.py     # Classifies errors (transient, schema, auth, permanent)
│   │   │   ├── recovery_engine.py      # Executes Policies A through G
│   │   │   └── runner.py               # Orchestrates trials, agents, tools, and DB trace persistence
│   │   ├── tools/
│   │   │   └── registry.py             # Benchmark tools (knowledge retrieval, calculator, database)
│   │   └── api/routes/
│   │       ├── auth.py                 # Login, Register, Demo session, /me, /logout
│   │       ├── health.py               # /health check (DB ping, version, mode)
│   │       ├── experiments.py          # CRUD for experiments & run trigger
│   │       ├── scenarios.py            # Fault scenarios & policies
│   │       ├── test_cases.py           # Standard test cases (TC-001 - TC-010)
│   │       ├── traces.py               # Step-by-step trace explorer
│   │       ├── metrics.py              # Dashboard KPIs & policy comparison
│   │       ├── reports.py              # Research reports and PDF export
│   │       ├── evidence.py             # Audit trail with credential redaction
│   │       └── exports.py              # JSON / CSV export endpoints
│   ├── tests/
│   │   ├── test_backend.py             # 86 unit tests (tools, fault injection, policies, metrics)
│   │   ├── test_persistence_and_cases.py # 4 persistence and sample test case execution tests
│   │   └── test_auth.py                # Authentication, password hashing, and token tests
│   ├── requirements.txt                # Pinned production Python dependencies
│   ├── .python-version                 # Set to 3.12 for Render compatibility
│   └── pytest.ini                      # Backend test configuration
├── frontend/
│   ├── src/
│   │   ├── App.tsx                     # React Router, code-splitting (React.lazy), ErrorBoundary
│   │   ├── main.tsx                    # Entry point, ErrorMonitor initialization
│   │   ├── context/
│   │   │   ├── AuthContext.tsx         # User authentication, token management, demo session
│   │   │   └── ThemeContext.tsx        # Dark / Light / System theme provider
│   │   ├── layouts/
│   │   │   └── AppLayout.tsx           # 9 SaaS nav sections, telemetry bar, fold shortcut
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx           # 6 KPI cards, policy bar chart, failure breakdown, recent runs
│   │   │   ├── CreateExperiment.tsx    # 6-step wizard with speech dictation
│   │   │   ├── ExperimentsList.tsx     # Experiment history with status filters
│   │   │   ├── ExperimentDetails.tsx   # Detailed run breakdown, steps, metrics
│   │   │   ├── TestCaseLibrary.tsx     # Standard test cases TC-001 through TC-010
│   │   │   ├── RecoveryStrategies.tsx  # Catalog of Policies A through G
│   │   │   ├── PolicyComparison.tsx    # Head-to-head empirical comparison matrix
│   │   │   ├── ResearchReports.tsx     # Executive reports & vector PDF download
│   │   │   ├── VoiceAssistantPage.tsx  # Interactive Speech AI page with audio playback
│   │   │   ├── TraceExplorer.tsx       # Step-by-step tool invocation traces
│   │   │   ├── Evidence.tsx            # Redacted audit logs and citations
│   │   │   ├── Settings.tsx            # System diagnostic checklist & keys
│   │   │   ├── Login.tsx               # Sign in & one-click Demo Researcher access
│   │   │   └── Register.tsx            # Researcher registration
│   │   ├── voice/
│   │   │   ├── useVoiceRecognition.ts  # Web Speech API speech-to-text
│   │   │   ├── useSpeechSynthesis.ts   # Web Speech Synthesis text-to-speech
│   │   │   └── commandParser.ts        # Natural language command classifier
│   │   ├── services/
│   │   │   ├── api.ts                  # Typed client service with Bearer auth injection
│   │   │   └── errorMonitor.ts         # Client error telemetry & sanitize
│   │   └── components/
│   │       ├── ErrorBoundary.tsx       # Graceful UI recovery boundary
│   │       ├── ProtectedRoute.tsx      # Auth guard for protected routes
│   │       ├── MetricCard.tsx          # Consistent KPI card component
│   │       └── ThemeToggle.tsx         # Dark/light mode switcher
│   ├── e2e/
│   │   └── trusttrace.spec.ts          # Playwright E2E tests (auth, dashboard, wizard, voice, theme)
│   ├── playwright.config.ts            # Playwright cross-browser configuration
│   └── package.json                    # Vite 8, React 19, Tailwind v4
└── README.md                           # Public repository overview & live URLs
```

---

## 3. The 7 Recovery Policies (Formal Definitions)

| Policy ID | Name | Core Algorithm | Best Suited For |
|---|---|---|---|
| `policy_a_baseline_stop` | **Baseline Stop** | Fail-fast: halts on the very first tool exception. | Control group / measuring raw reliability without recovery. |
| `policy_b_bounded_retry` | **Bounded Retry** | Exponential backoff: retries up to $N$ times ($2^{\text{retry}} \times \text{delay}$). | Transient network glitches, 503 errors, socket timeouts. |
| `policy_c_validation_retry` | **Validation & Retry** | Inspects error, validates schema parameters, repairs payload, then retries. | Malformed JSON, missing required fields, type mismatches. |
| `policy_d_fallback` | **Fallback** | Reroutes invocation to a secondary backup tool or cached replica. | Hard service outages, unresolvable 404/500 errors. |
| `policy_e_safe_stop` | **Safe Stop** | Freezes state cleanly without side effects or retry mutations. | Permission errors, unauthorized access, destructive actions. |
| `policy_f_clarification` | **Clarification** | Pauses autonomous loop and generates a supervisor prompt. | Ambiguous instructions, conflicting inputs, high-stakes decisions. |
| `policy_g_budget_aware` | **Budget-Aware** | Dynamically evaluates expected utility of retry against remaining token/time/cost budgets. | Production enterprise agents with strict cost ceilings and SLAs. |

---

## 4. Built-in Benchmark Test Cases (TC-001 - TC-010)

The system automatically initializes 10 benchmark test cases in the database:
1. `TC-001`: Timeout at Step 1 $\rightarrow$ Expected recovery: **Bounded Retry**
2. `TC-002`: Tool Unavailable at Step 2 $\rightarrow$ Expected recovery: **Fallback**
3. `TC-003`: Malformed JSON $\rightarrow$ Expected recovery: **Validation and Retry**
4. `TC-004`: Missing Response Fields $\rightarrow$ Expected recovery: **Validation and Retry**
5. `TC-005`: Invalid Arguments $\rightarrow$ Expected recovery: **Safe Stop**
6. `TC-006`: Empty Response $\rightarrow$ Expected recovery: **Retry or Fallback**
7. `TC-007`: Stale Data $\rightarrow$ Expected recovery: **Validate Freshness**
8. `TC-008`: Transient Error $\rightarrow$ Expected recovery: **Bounded Retry**
9. `TC-009`: Rate Limit $\rightarrow$ Expected recovery: **Budget-Aware Recovery**
10. `TC-010`: Schema Validation Failure $\rightarrow$ Expected recovery: **Validation and Retry**

---

## 5. REST API Quick Reference

### Authentication (`/api/v1/auth`)
- `POST /login`: Authenticate with `{ email, password }` $\rightarrow$ `{ access_token, user }`
- `POST /register`: Create account `{ email, password, name }` $\rightarrow$ `{ access_token, user }`
- `POST /demo`: Instant login as seeded researcher `researcher@trusttrace.ai` $\rightarrow$ `{ access_token, user }`
- `GET /me`: Get authenticated user profile (requires `Authorization: Bearer <token>`)
- `POST /logout`: Invalidate session

### Health (`/health`)
- `GET /health`: Database connection status (`ok`/`error`), database engine (`sqlite`/`postgresql`), version, and mode.

### Experiments & Runs (`/api/v1/experiments`)
- `GET /api/v1/experiments`: List experiments (paginated)
- `POST /api/v1/experiments`: Create experiment `{ name, hypothesis, policy_id, scenario_id, task_ids, ... }`
- `GET /api/v1/experiments/{id}`: Experiment details
- `POST /api/v1/experiments/{id}/run`: Execute all runs and persist traces
- `GET /api/v1/experiments/{id}/runs`: Runs associated with experiment
- `GET /api/v1/experiments/{id}/metrics`: Aggregated metrics

### Test Cases (`/api/v1/test-cases`)
- `GET /api/v1/test-cases`: List all test cases (`sample_only` filter supported)
- `POST /api/v1/test-cases/{id}/run`: Execute single test case and return outcome

### Reports (`/api/v1/reports`)
- `GET /api/v1/reports/overall`: Comprehensive benchmark report dataset
- `GET /api/v1/reports/overall/pdf`: Vector PDF research report download
- `GET /api/v1/reports/overall/markdown`: Markdown report export

---

## 6. How to Run Tests Locally

### Backend Unit & Integration Tests (pytest)
```bash
cd backend
python -m pytest
```
*Expected: 93 passing tests.*

### Frontend Unit & Component Tests (vitest)
```bash
cd frontend
npm test
```
*Expected: 9 passing tests across all components.*

### Frontend Production Build (TypeScript + Vite)
```bash
cd frontend
npm run build
```
*Expected: Successful minified build with vendor code-splitting.*

### End-to-End Tests (Playwright)
```bash
cd frontend
npx playwright test
```
*Runs desktop and mobile tests.*

---

## 7. Production Deployment Details

- **Frontend**: Hosted on Vercel at `https://trust-trace-lime.vercel.app/`
- **Backend**: Hosted on Render at `https://trusttrace-152v.onrender.com/`
- **API Docs**: Swagger UI at `https://trusttrace-152v.onrender.com/docs`
- **GitHub Repository**: `https://github.com/Gauravbodkhe/TrustTrace`
