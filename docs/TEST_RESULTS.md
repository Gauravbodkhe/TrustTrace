# TrustTrace — Automated Test & Build Execution Audit Results

**Date & Time of Execution:** 2026-10-29T19:26:00+05:30  
**Operating System:** Windows 11 (build 26100)  
**Environment Runtimes:**
- Python 3.11.9 (`C:\Users\Gaurav Bodhkhe\AppData\Local\Programs\Python\Python311\python.exe`)
- Node.js v20.18.0 / npm 11.6.0
- Vitest v5.0.5
- Pytest 8.3.4 (with pytest-asyncio 0.24.0, anyio 4.7.0)

---

## 1. Summary of Test Suites

| Test Suite | Framework | Target Files | Tests Executed | Passed | Failed | Duration | Status |
|---|---|---|---|---|---|---|---|
| **Backend Unit Tests** | Pytest 8.3 | [`backend/tests/test_backend.py`](file:///D:/TrustTrace/backend/tests/test_backend.py) | 86 | **86** | 0 | 8.36s | **PASS** |
| **Backend API Integration**| Pytest 8.3 | [`backend/tests/test_api.py`](file:///D:/TrustTrace/backend/tests/test_api.py) | 13 | **13** | 0 | 4.89s | **PASS** |
| **Frontend Unit & Pages** | Vitest 5.0 | `frontend/src/test/*.test.tsx` | 8 | **8** | 0 | 36.27s | **PASS** |
| **Total Automated Tests** | — | — | **107** | **107** | **0** | — | **100% PASS** |

---

## 2. Detailed Backend Test Results

### 2.1 Backend Unit Suite (`backend/tests/test_backend.py`)
**Command Executed:**
```powershell
cd D:\TrustTrace\backend
python -m pytest tests/test_backend.py -v
```

**Results Breakdown (86 Passed / 0 Failed):**
- **`TestSimulatedTools` (16 tests):**
  - `test_search_knowledge_base_returns_results`: PASSED
  - `test_search_knowledge_base_empty_query`: PASSED
  - `test_get_record_existing`: PASSED
  - `test_get_record_missing`: PASSED
  - `test_validate_data_valid`: PASSED
  - `test_validate_data_invalid_range`: PASSED
  - `test_validate_data_missing_required`: PASSED
  - `test_calculate_sum`: PASSED
  - `test_calculate_average`: PASSED
  - `test_calculate_unknown_operation`: PASSED
  - `test_calculate_no_operands`: PASSED
  - `test_generate_answer_with_question`: PASSED
  - `test_generate_answer_no_question`: PASSED
  - `test_unknown_tool`: PASSED
  - `test_tool_latency_recorded`: PASSED
  - `test_tool_token_usage_recorded`: PASSED
- **`TestFaultInjector` (15 tests):**
  - All 10 fault scenarios verified (`timeout`, `unavailable`, `malformed_json`, `missing_fields`, `invalid_arguments`, `empty_response`, `stale_data`, `transient_error`, `rate_limit`, `schema_validation`): PASSED
  - `test_probabilistic_injection_with_seed`: PASSED
  - `test_builtin_scenarios_present`: PASSED
  - `test_deterministic_reproducibility`: PASSED
- **`TestDiagnosisEngine` (10 tests):**
  - Error signatures, keyword extraction, and evidence arrays: PASSED
  - Ground truth preservation: PASSED
  - Confidence estimation constraints: PASSED
- **`TestRecoveryPolicies` (26 tests):**
  - `TestPolicyA` (2 tests: stops on failure, continues on success): PASSED
  - `TestPolicyB` (4 tests: retries, budget exhaustion, backoff growth): PASSED
  - `TestPolicyC` (3 tests: validates schema, retries invalid output, stops at budget): PASSED
  - `TestPolicyD` (3 tests: fallback activation, stop when no fallback, continue on success): PASSED
  - `TestPolicyE` (3 tests: safe stop on data integrity risk, safe retry of transient): PASSED
  - `TestPolicyF` (2 tests: clarification request generation, continue on success): PASSED
  - `TestPolicyG` (7 tests: multi-resource budget enforcement, safe stop, fallback priority): PASSED
  - `TestAllPoliciesRegistered` (2 tests): PASSED
- **`TestMetricsEngine` (7 tests):**
  - `test_task_success_rate_calculation`: PASSED
  - `test_unsafe_recovery_rate`: PASSED
  - `test_no_division_by_zero_empty_runs`: PASSED
  - `test_p95_latency_null_for_small_samples`: PASSED (P95 suppressed for n < 20)
  - `test_mean_latency_calculated`: PASSED
  - `test_estimated_cost_is_null`: PASSED (no fabricated costs)
  - `test_token_usage_aggregated`: PASSED
- **`TestMockAgent` (5 tests):**
  - Deterministic planning and tool schema validation: PASSED
- **`TestAgentRunner` (7 tests):**
  - Trace recording, fault injection tracking, bounded retry loops, fallback insertion: PASSED

---

### 2.2 Backend API Integration Suite (`backend/tests/test_api.py`)
**Command Executed:**
```powershell
cd D:\TrustTrace\backend
python -m pytest tests/test_api.py -v
```

**Results Breakdown (13 Passed / 0 Failed):**
- `TestHealthAPI::test_health_check`: PASSED (`status: ok`, `database: ok`)
- `TestScenariosAPI::test_list_scenarios`: PASSED (>= 10 standard scenarios)
- `TestScenariosAPI::test_list_policies`: PASSED (all 7 policies returned)
- `TestScenariosAPI::test_get_scenario_by_id`: PASSED
- `TestScenariosAPI::test_get_scenario_not_found`: PASSED (404 status)
- `TestScenariosAPI::test_create_and_update_custom_scenario`: PASSED (POST/PUT CRUD)
- `TestExperimentsAPI::test_list_tasks`: PASSED
- `TestExperimentsAPI::test_create_experiment_invalid_scenario`: PASSED (422 validation error)
- `TestExperimentsAPI::test_create_experiment_invalid_policy`: PASSED (422 validation error)
- `TestExperimentsAPI::test_create_experiment_invalid_task`: PASSED (422 validation error)
- `TestExperimentsAPI::test_full_experiment_lifecycle_api`: PASSED (Create → Details → Run → Traces → Decisions → Metrics → CSV/JSON/MD exports)
- `TestMetricsAggregationsAPI::test_dashboard_metrics`: PASSED
- `TestMetricsAggregationsAPI::test_policy_comparison_metrics`: PASSED (all 7 recovery policies evaluated)

---

## 3. Detailed Frontend Test & Build Results

### 3.1 Frontend Test Suite (`frontend/src/test/`)
**Command Executed:**
```powershell
cd D:\TrustTrace\frontend
npx vitest run
```

**Results Breakdown (8 Passed / 0 Failed):**
- `src/test/App.test.tsx` (3 tests):
  - `renders the layout with branding and navigation`: PASSED
  - `renders dashboard KPI cards and metrics from API`: PASSED
  - `supports theme toggling between light, dark, and system modes`: PASSED
- `src/test/Pages.test.tsx` (5 tests):
  - `renders CreateExperiment page with form controls`: PASSED
  - `renders PolicyComparison page with policy rows`: PASSED
  - `renders ScenarioLibrary page with scenarios`: PASSED
  - `renders ResearchReports page with export actions`: PASSED
  - `renders Settings page with system readiness checklist`: PASSED

---

### 3.2 Frontend Production Compilation (`npm run build`)
**Command Executed:**
```powershell
cd D:\TrustTrace\frontend
npm run build
```

**Output & Assets Summary:**
- TypeScript Typecheck (`tsc -b`): **0 errors**
- Vite Production Build (`vite build`): **0 errors**, completed in 13.13s
- Asset Bundles Generated:
  - `dist/index.html`: 1.16 kB (gzip: 0.58 kB)
  - `dist/assets/index-C0892MZR.css`: 51.43 kB (gzip: 8.81 kB)
  - `dist/assets/index-D8049SEQ.js`: 785.54 kB (gzip: 220.41 kB)

---

## 4. End-to-End Live Workflow Verification

A complete experiment was created, executed, and validated end-to-end:
```
1. Created Experiment: 8a62985e-7146-438d-934c-ee2641d93a6f
2. Execution Status: completed (Total runs: 2)
3. Task Success Rate: 1.0 (100.0%)
4. Recovery Success Rate: 1.0 (100.0%)
5. Traces Recorded: 3 steps per run with fault injection and recovery details
6. Recovery Decisions: Policy G fallback executed and recorded in DB
7. Markdown Research Report: 2,080 characters generated
8. CSV Export: 3 rows (header + 2 trial rows) generated
```

---

## 5. Known Limitations & Environment Details
1. **Windows Loopback Socket Sandbox Isolation:** Under the default Windows sandbox, in-process loopback sockets are isolated. Test suites invoking in-process network connections (`TestClient`) execute with full accuracy when running outside sandbox isolation (`BypassSandbox: true`).
2. **Supabase Cloud Credentials:** Absent in local dev; SQLite WAL mode serves as the local database tier.
3. **Live AI API Key:** Gemini API key is unset; deterministic `MockAgent` executes all benchmark evaluations reliably.
