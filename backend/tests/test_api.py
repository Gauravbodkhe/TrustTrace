"""
API Integration Tests for TrustTrace.
Tests all endpoints using FastAPI's TestClient.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestHealthAPI:
    def test_health_check(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["database"] == "ok"
        assert "version" in data
        assert "mock_mode" in data


class TestScenariosAPI:
    def test_list_scenarios(self):
        response = client.get("/api/v1/scenarios")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 10

    def test_list_policies(self):
        response = client.get("/api/v1/scenarios/policies/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 7
        policy_ids = [p["id"] for p in data]
        assert "policy_a_baseline_stop" in policy_ids
        assert "policy_g_budget_aware" in policy_ids

    def test_get_scenario_by_id(self):
        response = client.get("/api/v1/scenarios/transient_error_step1")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "transient_error_step1"
        assert data["category"] == "transient_error"

    def test_get_scenario_not_found(self):
        response = client.get("/api/v1/scenarios/nonexistent_scenario_123")
        assert response.status_code == 404

    def test_create_and_update_custom_scenario(self):
        create_payload = {
            "name": "Custom Test Timeout",
            "description": "Injected for API testing",
            "category": "timeout",
            "probability": 1.0,
            "deterministic_step": 1,
            "failure_delay_ms": 100,
            "severity": "high",
            "seed": 999,
        }
        res = client.post("/api/v1/scenarios", json=create_payload)
        assert res.status_code == 201
        created = res.json()
        scenario_id = created["id"]
        assert created["name"] == "Custom Test Timeout"

        # Update
        update_payload = {"name": "Updated Custom Timeout", "severity": "medium"}
        update_res = client.put(f"/api/v1/scenarios/{scenario_id}", json=update_payload)
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["name"] == "Updated Custom Timeout"
        assert updated["severity"] == "medium"


class TestExperimentsAPI:
    def test_list_tasks(self):
        response = client.get("/api/v1/exports/tasks/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 5

    def test_create_experiment_invalid_scenario(self):
        payload = {
            "name": "Invalid Scenario Experiment",
            "agent_type": "mock",
            "policy_id": "policy_a_baseline_stop",
            "scenario_id": "nonexistent_scenario",
            "task_ids": ["task_expense_policy"],
            "repetitions": 1,
        }
        response = client.post("/api/v1/experiments", json=payload)
        assert response.status_code == 422
        assert "not found" in response.json()["detail"].lower()

    def test_create_experiment_invalid_policy(self):
        payload = {
            "name": "Invalid Policy Experiment",
            "agent_type": "mock",
            "policy_id": "unknown_policy_xyz",
            "scenario_id": "transient_error_step1",
            "task_ids": ["task_expense_policy"],
            "repetitions": 1,
        }
        response = client.post("/api/v1/experiments", json=payload)
        assert response.status_code == 422
        assert "unknown policy" in response.json()["detail"].lower()

    def test_create_experiment_invalid_task(self):
        payload = {
            "name": "Invalid Task Experiment",
            "agent_type": "mock",
            "policy_id": "policy_g_budget_aware",
            "scenario_id": "transient_error_step1",
            "task_ids": ["nonexistent_task_999"],
            "repetitions": 1,
        }
        response = client.post("/api/v1/experiments", json=payload)
        assert response.status_code == 422
        assert "not found" in response.json()["detail"].lower()

    def test_full_experiment_lifecycle_api(self):
        # 1. Create experiment
        create_payload = {
            "name": "API Full Lifecycle Test",
            "description": "Verifying complete API workflow",
            "agent_type": "mock",
            "policy_id": "policy_g_budget_aware",
            "scenario_id": "transient_error_step1",
            "task_ids": ["task_expense_policy"],
            "repetitions": 1,
            "seed": 4242,
            "max_retries": 2,
            "timeout_seconds": 15,
        }
        create_res = client.post("/api/v1/experiments", json=create_payload)
        assert create_res.status_code == 201
        exp = create_res.json()
        exp_id = exp["id"]
        assert exp["status"] == "pending"

        # 2. Get experiment details
        get_res = client.get(f"/api/v1/experiments/{exp_id}")
        assert get_res.status_code == 200
        assert get_res.json()["name"] == "API Full Lifecycle Test"

        # 3. Trigger run
        run_res = client.post(f"/api/v1/experiments/{exp_id}/run")
        assert run_res.status_code == 200
        run_data = run_res.json()
        assert run_data["status"] == "completed"
        assert run_data["total_runs"] == 1
        run_id = run_data["run_ids"][0]

        # 4. List runs for experiment
        runs_res = client.get(f"/api/v1/experiments/{exp_id}/runs")
        assert runs_res.status_code == 200
        runs = runs_res.json()
        assert len(runs) == 1
        assert runs[0]["outcome"] == "success"

        # 5. Get traces for run
        traces_res = client.get(f"/api/v1/runs/{run_id}/traces")
        assert traces_res.status_code == 200
        traces = traces_res.json()
        assert len(traces) >= 2
        assert any(t["fault_injected"] for t in traces)

        # 6. Get decisions for run
        decisions_res = client.get(f"/api/v1/runs/{run_id}/decisions")
        assert decisions_res.status_code == 200
        decisions = decisions_res.json()
        assert len(decisions) >= 1

        # 7. Get experiment metrics
        metrics_res = client.get(f"/api/v1/experiments/{exp_id}/metrics")
        assert metrics_res.status_code == 200
        metrics = metrics_res.json()
        assert len(metrics) >= 1
        assert metrics[0]["task_success_rate"] == 1.0

        # 8. Export CSV
        csv_res = client.get(f"/api/v1/exports/{exp_id}/csv")
        assert csv_res.status_code == 200
        assert "text/csv" in csv_res.headers["content-type"]
        assert "run_id,experiment_id" in csv_res.text

        # 9. Export JSON
        json_res = client.get(f"/api/v1/exports/{exp_id}/json")
        assert json_res.status_code == 200
        assert "application/json" in json_res.headers["content-type"]
        export_json = json_res.json()
        assert "export_metadata" in export_json
        assert "experiment" in export_json
        assert len(export_json["runs"]) == 1

        # 10. Export Markdown Report
        report_res = client.get(f"/api/v1/exports/{exp_id}/report")
        assert report_res.status_code == 200
        assert "text/markdown" in report_res.headers["content-type"]
        assert "# TrustTrace Experiment Report" in report_res.text


class TestMetricsAggregationsAPI:
    def test_dashboard_metrics(self):
        response = client.get("/api/v1/metrics/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "total_experiments" in data
        assert "total_runs" in data
        assert "task_success_rate" in data
        assert "outcome_distribution" in data

    def test_policy_comparison_metrics(self):
        response = client.get("/api/v1/metrics/comparison")
        assert response.status_code == 200
        data = response.json()
        assert "policies" in data
        assert isinstance(data["policies"], list)
        assert len(data["policies"]) == 7
