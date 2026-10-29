# TrustTrace System Architecture

## 1. Executive Summary

**TrustTrace** is an empirical research and testing platform designed to evaluate failure recovery in tool-using AI agents under controlled operational faults. Rather than relying on static evaluation or fabricated mock numbers, TrustTrace executes tool-call sequences through a modular runtime that injects deterministic or stochastic failures, diagnoses failure categories via rule-based telemetry inspection, executes configurable recovery strategies (Policies A through G), and records comprehensive execution traces into relational storage.

---

## 2. Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 TRUSTTRACE UI                                     |
|  React 18 + TypeScript + Vite + Tailwind CSS + Recharts + Lucide Icons            |
|  [Overview] [Create Exp] [Policy Comparison] [Traces] [Scenarios] [Reports]       |
+-----------------------------------------+-----------------------------------------+
                                          |
                                HTTP / JSON REST APIs
                                          |
+-----------------------------------------v-----------------------------------------+
|                                FASTAPI BACKEND                                    |
|                                                                                   |
|  +---------------------+   +---------------------+   +-------------------------+  |
|  |   API Controllers   |   |   Agent Interface   |   |    Simulated Registry   |  |
|  | - /experiments      |   | - MockAgent (v1.0)  |   | - search_knowledge_base |  |
|  | - /scenarios        |   | - GeminiAgent       |   | - get_record            |  |
|  | - /traces           |   +----------+----------+   | - validate_data         |  |
|  | - /metrics          |              |              | - calculate_result      |  |
|  | - /exports          |              v              | - generate_answer       |  |
|  +----------+----------+     +-----------------+     | - fallback tools        |  |
|             |                |   AgentRunner   |     +------------+------------+  |
|             |                +--------+--------+                  |               |
|             |                         |                           |               |
|             |      +------------------+-------------------+       |               |
|             |      |                  |                   |       |               |
|             |      v                  v                   v       v               |
|             |  +-----------+  +---------------+  +--------------------+           |
|             |  |   Fault   |  |   Diagnosis   |  |  Recovery Engine   |           |
|             |  | Injector  |  |    Engine     |  | (Policies A to G)  |           |
|             |  +-----------+  +---------------+  +--------------------+           |
|             |                                                             |       |
|             v                                                             v       |
|  +-----------------------------------------------------------------------------+  |
|  |                  Repository & SQLAlchemy Async Engine (WAL)                 |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------+-----------------------------------------+
                                          |
                             Async SQLite / PostgreSQL
                                          |
+-----------------------------------------v-----------------------------------------+
|                             DATABASE STORAGE LAYER                                |
|  - tasks                                      - experiment_runs                   |
|  - fault_scenarios                            - execution_traces                  |
|  - experiments                                - recovery_decisions                |
|  - metric_summaries                                                               |
+-----------------------------------------------------------------------------------+
```

---

## 3. Core Subsystems

### 3.1 Simulated Tools Registry (`backend/app/tools/registry.py`)
Provides deterministic in-memory implementations of realistic agent tools:
- `search_knowledge_base`: Natural language search across simulated documentation with versioning.
- `search_knowledge_base_v2`: Broader fallback keyword matching tool.
- `get_record`: Entity retrieval by ID (`USR-*`, `ORD-*`, `TKT-*`).
- `validate_data`: Structured constraint validation with configurable min/max bounds and required keys.
- `calculate_result`: Arithmetic operations with zero-division safety (`sum`, `average`, `product`, `max`, `min`, `count`).
- `generate_answer`: Structured synthesis of context into a cited response.

### 3.2 Fault Injection Engine (`backend/app/services/fault_injector.py`)
Simulates 10 standard production fault conditions without impacting real network services:
1. `timeout`: Simulates execution latency exceeding deadlines.
2. `tool_unavailable`: Simulates HTTP 503 service outages.
3. `malformed_json`: Simulates syntax/parser failures in API payloads.
4. `missing_fields`: Simulates incomplete response payloads omitting required keys.
5. `invalid_arguments`: Simulates bad request errors from parameter type mismatches.
6. `empty_response`: Simulates HTTP 200 responses with empty bodies.
7. `stale_data`: Simulates successful tool calls returning outdated data flags.
8. `transient_error`: Simulates transient gateway errors safe for retry.
9. `rate_limit`: Simulates HTTP 429 quota exhaustion.
10. `schema_validation`: Simulates responses violating typed schemas.

### 3.3 Diagnosis Engine (`backend/app/services/diagnosis_engine.py`)
A transparent, rule-based classification system that parses error messages, status codes, and output shapes.
- Ground Truth is tracked in controlled simulations.
- Outputs confidence scores only when evidence is deterministic.
- Explanations list the specific evidence tokens identified.

### 3.4 Recovery Engine (`backend/app/services/recovery_engine.py`)
Implements 7 distinct recovery strategies:
- **Policy A (Baseline Stop):** Terminate immediately on any failure.
- **Policy B (Bounded Retry):** Exponential backoff retries up to maximum retry limit.
- **Policy C (Validation Retry):** Inspect output schema; retry if corrupt.
- **Policy D (Fallback):** Switch to alternative registered secondary tools.
- **Policy E (Safe Stop):** Terminate if continuing risks data corruption or safety violation.
- **Policy F (Clarification):** Return structured user clarification requests.
- **Policy G (Proposed Budget-Aware):** Inspect failure class, remaining time/retry/cost budgets, fallback options, and safety rules to select optimal remediation.

---

## 4. Security & Privacy Architecture
1. **Secrets Isolation:** No credentials (Gemini API keys, Supabase service roles) are accessible from the frontend client.
2. **Automatic Redaction:** Execution traces scrub sensitive keywords (`password`, `api_key`, `token`, `secret`) before database writes.
3. **Controlled Sandbox:** The fault injector exclusively operates within memory; no hostile network requests are performed.
