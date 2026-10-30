# TrustTrace

**AI Agent Reliability Testing and Recovery Platform**  
*A controlled empirical benchmark for evaluating failure recovery in tool-using AI agents.*

🚀 Live Demo: https://trust-trace-lime.vercel.app/

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/react-18-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/backend%20tests-106%20passed-emerald.svg)]()
[![Frontend Tests](https://img.shields.io/badge/frontend%20tests-8%20passed-emerald.svg)]()
[![Vector PDF](https://img.shields.io/badge/PDF%20Engine-ReportLab-red.svg)]()
[![Voice Assistant](https://img.shields.io/badge/Voice-Web%20Speech%20API-indigo.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌐 Live Deployment

- Frontend: https://trust-trace-lime.vercel.app/
- Backend API: https://trusttrace-152v.onrender.com/
- API Documentation: https://trusttrace-152v.onrender.com/docs

---

## 🗄️ Database Setup & Permanent Persistence

TrustTrace supports **dual database persistence**:
1. **Local Development (Default):** Zero-credential, file-backed **SQLite** with Write-Ahead Logging (WAL). Requires zero external configuration and works offline immediately.
2. **Production Deployment (Supabase PostgreSQL):** Cloud-hosted PostgreSQL ensuring data permanence across Render deployments and container restarts.

### 1. Local Development (SQLite)
If `DATABASE_URL` is not set, TrustTrace automatically defaults to:
```
DATABASE_URL=sqlite:///./trusttrace.db
```
Tables are auto-created idempotently on startup. Standard benchmark tasks and sample test cases are seeded without duplicating on restarts.

### 2. Production Persistence with Supabase
Render instances run on ephemeral filesystems where local SQLite databases reset upon every deploy or restart. Connecting to **Supabase PostgreSQL** provides permanent storage for all test results, traces, and metrics.

#### Step 1: Create a Free Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Under **Project Settings &rarr; Database**, find your **Connection String**.
3. Select **URI** (Connection pooling port `6543` or direct port `5432`).
4. Replace `[YOUR-PASSWORD]` with your actual database password:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

#### Step 2: Configure DATABASE_URL in Render
1. Open your backend web service dashboard on [render.com](https://dashboard.render.com).
2. Navigate to **Environment**.
3. Add or update the environment variable:
   - **Key:** `DATABASE_URL`
   - **Value:** Your Supabase connection string (e.g. `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres`)
4. Save Changes. Render will redeploy automatically.
5. TrustTrace will connect using connection pooling (`pool_pre_ping=True`, `sslmode=require`) and create all tables idempotently.

#### Step 3: Migrate Existing SQLite Data to PostgreSQL (Optional)
To transfer existing local test history and custom scenarios to Supabase without data loss, run the safe migration script:
```powershell
python backend/scripts/migrate_sqlite_to_postgres.py --sqlite trusttrace.db --postgres "postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"
```
The script validates both connections, ensures target tables exist, and migrates all records with duplicate prevention.

#### Step 4: Database Migrations with Alembic
Alembic migrations are configured to manage schema evolutions safely:
```powershell
# Run pending migrations
alembic upgrade head

# Check current revision
alembic current
```

---

## 1. Problem Statement & Research Objective

Tool-using AI agents inevitably encounter runtime exceptions when querying external systems: network timeouts, malformed JSON responses, rate limits, schema mismatches, and transient server outages. Naive retry loops increase latency, inflate API token costs, and risk propagating corrupt data into downstream decision pipelines.

**TrustTrace** provides a controlled, reproducible experimentation environment to:
- Inject 10 distinct, realistic tool fault scenarios without risking live infrastructure.
- Evaluate and compare 7 different failure recovery strategies under identical task conditions.
- Observe chronological step-by-step traces with inputs, outputs, fault markers, and rule-based diagnoses.
- Compute mathematically grounded metrics: task success rate, recovery success rate, unsafe recovery rate, diagnosis accuracy, latency, and retry counts.
- Export raw experiment traces to CSV and JSON, and generate Markdown research reports.
- **Maintain absolute scientific honesty:** Telemetry distinguishes between measured and unavailable values. Zero fabricated statistics.

---

## 2. Research Hypothesis

> *"Can a budget-aware, safety-constrained recovery policy (Policy G) improve task completion for tool-using AI agents without disproportionate increases in latency, API cost, or unsafe recovery decisions?"*

TrustTrace treats this as an empirical research question. Baseline policies (A: Stop, B: Bounded Retry, C: Validation Retry, D: Fallback, E: Safe Stop, F: Clarification) serve as rigorous experimental controls.

---

## 3. Technology Stack

- **Backend:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2 (AsyncIO), HTTPX, Pytest.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS v4, Recharts, React Router v6, Lucide Icons.
- **Database:** SQLite with Write-Ahead Logging (zero-credential local dev), compatible with Supabase PostgreSQL in production.
- **AI Integration:** Google Gemini API supported via official Python SDK; complete deterministic MockAgent provided for zero-API-key local testing.
- **Testing:** Pytest (86 tests) & Vitest (7 tests).

---

## 4. Architecture

```
+-----------------------------------------------------------------------------------+
|                            TRUSTTRACE RESEARCH DASHBOARD                          |
|             React 18 • TypeScript • Tailwind CSS • Recharts • Vite                |
|  [Overview] [Create Exp] [Policy Comparison] [Traces] [Scenarios] [Reports]       |
+-----------------------------------------+-----------------------------------------+
                                          | REST API (JSON)
+-----------------------------------------v-----------------------------------------+
|                               FASTAPI ENGINE                                      |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|  |     Endpoints      |  |   Agent Runners    |  |     Simulated Registry      |  |
|  | - /experiments     |  | - MockAgent (v1.0) |  | - search_knowledge_base     |  |
|  | - /scenarios       |  | - GeminiAgent      |  | - get_record                |  |
|  | - /traces          |  +---------+----------+  | - validate_data             |  |
|  | - /metrics         |            |             | - calculate_result          |  |
|  | - /exports         |            v             | - generate_answer           |  |
|  +---------+----------+   +-----------------+    +--------------+--------------+  |
|            |              | Fault Injector  |                   |                 |
|            |              | (10 scenarios)  |                   |                 |
|            |              +--------+--------+                   |                 |
|            |                       v                            |                 |
|            |              +-----------------+                   |                 |
|            |              | Diagnosis Engine|                   |                 |
|            |              +--------+--------+                   |                 |
|            |                       v                            |                 |
|            |              +-----------------+                   |                 |
|            |              | Recovery Engine |<------------------+                 |
|            |              | (Policies A–G)  |                                     |
|            |              +--------+--------+                                     |
|            v                       v                                              |
|  +-----------------------------------------------------------------------------+  |
|  |             SQLAlchemy Async Repository (SQLite / Supabase Postgres)        |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 5. Repository Structure

```
TrustTrace/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application entry point
│   │   ├── core/                       # App configuration and redacted logging
│   │   ├── api/routes/                 # Endpoints (experiments, traces, metrics, etc.)
│   │   ├── models/                     # SQLAlchemy async ORM models
│   │   ├── schemas/                    # Pydantic v2 schemas
│   │   ├── agents/                     # BaseAgent, MockAgent, GeminiAgent
│   │   ├── tools/                      # In-memory simulated tool registry
│   │   ├── services/                   # Injector, Diagnoser, Recovery, Metrics
│   │   └── db/                         # Database engine, repository, benchmark data
│   ├── tests/                          # Backend Pytest test suite (86 tests)
│   ├── requirements.txt
│   ├── pytest.ini
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── layouts/                    # AppLayout with sidebar & status
│   │   ├── pages/                      # 8 core research views
│   │   ├── services/                   # Type-safe API client
│   │   ├── types/                      # TypeScript domain definitions
│   │   └── test/                       # Vitest component & page tests (7 tests)
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docs/                               # Research and architectural documentation
│   ├── ARCHITECTURE.md
│   ├── RESEARCH_METHODOLOGY.md
│   ├── EXPERIMENT_GUIDE.md
│   ├── DEPLOYMENT.md
│   └── SECURITY.md
├── docker-compose.yml
├── IMPLEMENTATION_PLAN.md
├── LICENSE
└── README.md
```

---

## 6. Getting Started (Windows PowerShell)

### Prerequisites
- Python 3.11+
- Node.js 20+ & npm

### Step 1: Clone and Configure Environment
```powershell
cd D:\TrustTrace
Copy-Item backend\.env.example backend\.env
```

### Step 2: Install and Run Backend
```powershell
cd D:\TrustTrace\backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend initializes the SQLite database and seeds standard benchmark tasks on first startup.  
Interactive OpenAPI documentation is live at: `http://127.0.0.1:8000/docs`.

### Step 3: Install and Run Frontend
In a new terminal:
```powershell
cd D:\TrustTrace\frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 7. Running Tests

### Backend Unit & Integration Tests (Pytest)
```powershell
cd D:\TrustTrace\backend
python -m pytest tests/test_backend.py -v
```
*Expected: 86 passed tests covering all 10 fault types, 7 policies, tools, diagnosis, and metrics.*

### Frontend Tests (Vitest)
```powershell
cd D:\TrustTrace\frontend
npx vitest run
```
*Expected: 7 passed tests covering Layout, Dashboard, Form Controls, Traces, and Comparison Matrix.*

### Production Build Verification
```powershell
cd D:\TrustTrace\frontend
npm run build
```

---

## 8. Evaluated Recovery Policies

| Policy | Name | Strategy |
| :--- | :--- | :--- |
| **Policy A** | Baseline Stop | Halts immediately upon any tool error. Serves as minimal control. |
| **Policy B** | Bounded Retry | Retries transient errors with exponential backoff up to retry budget. |
| **Policy C** | Validation Retry | Validates tool output schemas; retries if payload is malformed or invalid. |
| **Policy D** | Tool Fallback | Dynamically switches to secondary registered tool when primary fails. |
| **Policy E** | Safe Stop | Halts execution if continuing risks safety violations or data corruption. |
| **Policy F** | Clarification | Returns structured prompt requesting human intervention. |
| **Policy G** | Proposed Budget-Aware | Evaluates fault classification, latency/retry budget, fallback tools, and safety constraints. |

---

## 9. Simulated Fault Scenario Catalog

1. `timeout_step1`: Tool call exceeds deadline (simulated timeout).
2. `tool_unavailable_step2`: Service unavailable (simulated HTTP 503).
3. `malformed_json_step1`: Broken JSON syntax returned from tool.
4. `missing_fields_step2`: Missing required keys in tool response dictionary.
5. `invalid_args_step1`: Bad parameter types supplied to tool.
6. `empty_response_step2`: HTTP 200 returned with empty body `{}`.
7. `stale_data_step1`: Outdated data flag returned (72 hours stale).
8. `transient_error_step1`: Transient server error safe for retry.
9. `rate_limit_step1`: Simulated HTTP 429 quota exhaustion.
10. `schema_validation_step2`: Output field types violate expected schema.

---

## 🧪 Standard Sample Test Cases (10 Benchmark Cases)

TrustTrace includes 10 pre-configured sample test cases permanently stored in the database (`sample_test_cases` table). Users can run each case with one click, or duplicate and customize parameters:

| Case ID | Test Name | Injected Fault | Expected Recovery | Recommended Policy |
| :--- | :--- | :--- | :--- | :--- |
| **TC-001** | API Timeout | Tool call exceeds deadline (timeout) | Bounded Retry | Policy B: Bounded Retry |
| **TC-002** | Tool Unavailable | Service outage (HTTP 503) | Fallback | Policy D: Fallback |
| **TC-003** | Malformed JSON | Syntax error in tool JSON response | Validation and Retry | Policy C: Validation Retry |
| **TC-004** | Missing Fields | Required schema fields absent | Validation | Policy C: Validation Retry |
| **TC-005** | Invalid Arguments | Invalid parameter types provided | Safe Stop | Policy E: Safe Stop |
| **TC-006** | Empty Response | HTTP 200 returned with `{}` body | Retry or Fallback | Policy D: Fallback |
| **TC-007** | Stale Data | Data age exceeds 72h threshold | Validate Freshness | Policy C: Validation Retry |
| **TC-008** | Rate Limit | HTTP 429 quota exhaustion | Budget-Aware Recovery | Policy G: Budget-Aware |
| **TC-009** | Authentication Failure | HTTP 401 unauthorized / expired key | Safe Stop | Policy E: Safe Stop |
| **TC-010** | Network Failure | Socket reset (ECONNRESET) | Bounded Retry | Policy B: Bounded Retry |

- **No fake results:** Sample cases remain purely configuration templates until explicitly run. Actual traces and metrics are saved only upon execution.
- **Idempotent restarts:** Seeding checks primary keys (`TC-001` .. `TC-010`) to prevent duplicate records upon backend restarts.

---

Every experiment records run-level telemetry with exact timestamps, step inputs/outputs (redacted), diagnoses, and recovery decisions.

- **Vector PDF Generator (ReportLab & NumberedCanvas):** Generates academic, publication-grade vector PDF reports with running headers, dynamic "Page X of Y" pagination, executive summary, policy matrix tables, fault distributions, threats to validity, and execution trace appendices.
- **Combined Overall Report:** Aggregates telemetry across all executed experiments or filtered subsets (by policy, scenario, date).
- **Single-Experiment Focus:** Generates standalone vector PDFs for individual trials.
- **CSV & JSON Exports:** Raw tabular and hierarchical trace data for R, Pandas, and Python evaluation scripts.
- **Markdown Export:** Academic markdown document for research paper integration.
- **Browser Print:** Native print styles formatted for physical printers and PDF printouts.

---

## 11. Multi-Layer Evidence & Explainability Engine

Located at `/evidence`, the Evidence audit panel categorizes experimental results into five distinct, unmingled evidential layers:
1. **Observed Evidence:** Raw tool invocations, inputs, and outputs with PII/secrets redacted, exact latencies, and tool exit statuses.
2. **Calculated Metrics:** Wall-clock duration, consumed retry budgets, and token usage.
3. **Rule-Based Diagnosis:** Deterministic fault identification comparing ground-truth injected faults against diagnosed fault categories and decision chains.
4. **AI-Generated Explanations:** LLM synthesis providing root-cause hypotheses, recovery assessments, and citations linked to concrete trace events. Explicitly marked with academic disclaimers.
5. **Missing Evidence Checklist:** Transparently reports unmeasured parameters (e.g., external LLM dollar costs when executing in deterministic mock mode) to prevent fabrication.

---

## 12. Interactive Voice Assistant & Voice Typing

TrustTrace includes a hands-free voice control subsystem built using the Web Speech API:
- **Speech-to-Text Voice Typing:** Integrated into experiment name, research hypothesis, task search, and dashboard filter fields.
- **Natural Command Parsing:** Maps spoken queries into safe UI actions, including:
  - `"Compare all recovery policies"` -> navigates to Policy Comparison.
  - `"Create a new experiment"` -> opens Experiment Creation wizard.
  - `"Generate overall report"` -> triggers PDF report generation.
  - `"Explain why this run failed"` -> opens the Evidence audit layer.
- **Text-to-Speech Synthesis:** Features Play, Pause, Resume, and Stop controls for listening to findings and diagnoses without vocalizing sensitive tokens.

---

## 13. Security & Redaction Model

- **Automated Secret Redaction:** Recursive data sanitization engine (`redactor.py`) masks passwords, auth keys, Bearer tokens, OpenAI/Google API keys, email addresses, and credit card patterns as `[REDACTED_SECRET]` prior to database persistence and UI rendering.
- **No Secret Exposure:** API keys and connection strings remain strictly server-side.
- **Safe Sandboxing:** Fault injection is exclusively in-memory simulation without external network threats.

---

## 14. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
