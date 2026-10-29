# TrustTrace Experimentation & Reproducibility Guide

This guide outlines step-by-step instructions for running controlled reliability experiments using TrustTrace.

---

## 1. Quick Start: Running an Experiment via Web UI

1. Start the TrustTrace Backend on `http://localhost:8000`:
   ```powershell
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```
2. Start the TrustTrace Frontend on `http://localhost:5173`:
   ```powershell
   cd frontend
   npm run dev
   ```
3. Open your browser to `http://localhost:5173`.
4. Click **Run Experiment** or navigate to **Create Experiment**.
5. Configure the trial parameters:
   - **Title:** e.g. `Evaluation of Bounded Retry under 503 Outages`
   - **Policy:** Select Policy B (Bounded Retry) or Policy G (Budget-Aware)
   - **Fault Scenario:** e.g. `Transient Error at Step 1`
   - **Tasks:** Check the benchmark tasks to evaluate
   - **Repetitions:** Set number of trials (e.g. 3)
   - **Seed:** Keep constant (e.g. 42) for exact reproducibility
6. Click **Create & Execute Experiment**.
7. Observe real-time traces and download the CSV/JSON exports when complete.

---

## 2. Running an Experiment via REST API

Create an experiment via HTTP POST:

```powershell
$headers = @{ "Content-Type" = "application/json" }
$body = @{
    name = "API Automated Benchmark"
    description = "Testing Policy G against Malformed JSON"
    agent_type = "mock"
    policy_id = "policy_g_budget_aware"
    scenario_id = "malformed_json_step1"
    task_ids = @("task_expense_policy", "task_order_lookup")
    repetitions = 2
    seed = 42
    max_retries = 3
    timeout_seconds = 30
    token_budget = 2000
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/experiments" -Method Post -Headers $headers -Body $body
$expId = $response.id
Write-Host "Created experiment ID: $expId"

# Trigger execution
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/experiments/$expId/run" -Method Post
```

Poll metrics:
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/experiments/$expId/metrics"
```

Download report:
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/exports/$expId/report"
```

---

## 3. Seeded Reproducibility Guarantee

TrustTrace guarantees that given:
1. The same `seed` (e.g. `seed = 42`)
2. The same `agent_type` (`mock`)
3. The same `task_ids`
4. The same `scenario_id`
5. The same `policy_id`

The sequence of injected faults, step decisions, and recovery actions will execute identically across any machine running Python 3.11+.
