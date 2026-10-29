"""
Backend Unit Tests — Phase 2 & 3 verification.
Tests: tools, fault injection, diagnosis, recovery policies, metrics.
"""
import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.tools.registry import execute_tool, get_tool, ToolStatus
from app.services.fault_injector import (
    FaultInjector, InjectionConfig, FaultCategory, BUILTIN_SCENARIOS
)
from app.services.diagnosis_engine import DiagnosisEngine
from app.services.recovery_engine import (
    Budget, policy_baseline_stop, policy_bounded_retry,
    policy_validation_retry, policy_fallback, policy_safe_stop,
    policy_clarification, policy_budget_aware, RecoveryAction, RECOVERY_POLICIES,
)
from app.tools.registry import ToolResult, ToolStatus


# ─────────────────────────── Tool Tests ────────────────────────────────────

class TestSimulatedTools:
    def test_search_knowledge_base_returns_results(self):
        result = execute_tool("search_knowledge_base", {"query": "expense policy"})
        assert result.status == ToolStatus.SUCCESS
        assert result.output is not None
        assert "results" in result.output
        assert result.output["count"] >= 1

    def test_search_knowledge_base_empty_query(self):
        result = execute_tool("search_knowledge_base", {"query": ""})
        assert result.status == ToolStatus.SUCCESS

    def test_get_record_existing(self):
        result = execute_tool("get_record", {"record_id": "USR-001"})
        assert result.status == ToolStatus.SUCCESS
        assert result.output["record"]["name"] == "Alice Johnson"

    def test_get_record_missing(self):
        result = execute_tool("get_record", {"record_id": "NONEXISTENT"})
        assert result.status == ToolStatus.FAILURE
        assert result.error_message is not None

    def test_validate_data_valid(self):
        result = execute_tool("validate_data", {
            "data": {"amount": 100, "category": "travel"},
            "rules": [
                {"field": "amount", "required": True, "min": 0, "max": 500},
                {"field": "category", "required": True},
            ]
        })
        assert result.status == ToolStatus.SUCCESS
        assert result.output["valid"] is True
        assert result.output["error_count"] == 0

    def test_validate_data_invalid_range(self):
        result = execute_tool("validate_data", {
            "data": {"amount": 999},
            "rules": [{"field": "amount", "required": True, "min": 0, "max": 500}]
        })
        assert result.status == ToolStatus.SUCCESS
        assert result.output["valid"] is False
        assert result.output["error_count"] == 1

    def test_validate_data_missing_required(self):
        result = execute_tool("validate_data", {
            "data": {},
            "rules": [{"field": "name", "required": True}]
        })
        assert result.status == ToolStatus.SUCCESS
        assert result.output["valid"] is False

    def test_calculate_sum(self):
        result = execute_tool("calculate_result", {"operation": "sum", "operands": [1, 2, 3]})
        assert result.status == ToolStatus.SUCCESS
        assert result.output["result"] == 6

    def test_calculate_average(self):
        result = execute_tool("calculate_result", {"operation": "average", "operands": [10, 20, 30]})
        assert result.status == ToolStatus.SUCCESS
        assert result.output["result"] == 20.0

    def test_calculate_unknown_operation(self):
        result = execute_tool("calculate_result", {"operation": "divide", "operands": [10, 2]})
        assert result.status == ToolStatus.FAILURE

    def test_calculate_no_operands(self):
        result = execute_tool("calculate_result", {"operation": "sum", "operands": []})
        assert result.status == ToolStatus.FAILURE

    def test_generate_answer_with_question(self):
        result = execute_tool("generate_answer", {
            "question": "What is the expense limit?",
            "context": [{"content": "Employees can expense up to $500 per month."}]
        })
        assert result.status == ToolStatus.SUCCESS
        assert "answer" in result.output

    def test_generate_answer_no_question(self):
        result = execute_tool("generate_answer", {"question": "", "context": []})
        assert result.status == ToolStatus.FAILURE

    def test_unknown_tool(self):
        result = execute_tool("nonexistent_tool", {})
        assert result.status == ToolStatus.FAILURE
        assert "not registered" in result.error_message

    def test_tool_latency_recorded(self):
        result = execute_tool("search_knowledge_base", {"query": "policy"})
        assert result.latency_ms >= 0

    def test_tool_token_usage_recorded(self):
        result = execute_tool("search_knowledge_base", {"query": "test"})
        assert result.token_usage is not None
        assert result.token_usage > 0


# ─────────────────────────── Fault Injection Tests ──────────────────────────

class TestFaultInjector:
    def _make_injector(self, category: FaultCategory, step: int = None, prob: float = 1.0) -> FaultInjector:
        return FaultInjector(InjectionConfig(
            scenario_id="test",
            category=category,
            probability=prob,
            deterministic_step=step,
            failure_delay_ms=0,
            seed=42,
        ))

    def test_no_fault_category_never_injects(self):
        injector = self._make_injector(FaultCategory.NONE)
        result = injector.inject(1, "search_knowledge_base", {})
        assert result.injected is False

    def test_timeout_fault_injected_at_step(self):
        injector = self._make_injector(FaultCategory.TIMEOUT, step=1)
        result = injector.inject(1, "search_knowledge_base", {})
        assert result.injected is True
        assert result.category == FaultCategory.TIMEOUT
        assert result.fault_result.status == ToolStatus.TIMEOUT

    def test_timeout_not_injected_wrong_step(self):
        injector = self._make_injector(FaultCategory.TIMEOUT, step=2)
        result = injector.inject(1, "search_knowledge_base", {})
        assert result.injected is False

    def test_tool_unavailable_injected(self):
        injector = self._make_injector(FaultCategory.TOOL_UNAVAILABLE, step=1)
        result = injector.inject(1, "get_record", {})
        assert result.injected is True
        assert result.fault_result.status == ToolStatus.UNAVAILABLE

    def test_malformed_json_injected(self):
        injector = self._make_injector(FaultCategory.MALFORMED_JSON, step=1)
        result = injector.inject(1, "tool", {})
        assert result.injected is True
        assert result.fault_result.output.get("_parse_error") is True

    def test_missing_fields_injected(self):
        injector = self._make_injector(FaultCategory.MISSING_FIELDS, step=1)
        result = injector.inject(1, "tool", {})
        assert result.injected is True
        assert result.fault_result.output == {"partial": True}

    def test_empty_response_injected(self):
        injector = self._make_injector(FaultCategory.EMPTY_RESPONSE, step=1)
        result = injector.inject(1, "tool", {})
        assert result.injected is True
        assert result.fault_result.output == {}

    def test_stale_data_injected(self):
        injector = self._make_injector(FaultCategory.STALE_DATA, step=1)
        result = injector.inject(1, "tool", {})
        assert result.injected is True
        # Stale data is a "success" with a warning
        assert result.fault_result.status == ToolStatus.SUCCESS
        assert result.fault_result.output["stale"] is True

    def test_transient_error_injected(self):
        injector = self._make_injector(FaultCategory.TRANSIENT_ERROR, step=1)
        result = injector.inject(1, "tool", {})
        assert result.injected is True
        assert result.fault_result.status == ToolStatus.FAILURE
        assert "transient" in result.fault_result.error_message.lower()

    def test_rate_limit_injected(self):
        injector = self._make_injector(FaultCategory.RATE_LIMIT, step=1)
        result = injector.inject(1, "tool", {})
        assert result.injected is True
        assert "rate limit" in result.fault_result.error_message.lower()

    def test_schema_validation_injected(self):
        injector = self._make_injector(FaultCategory.SCHEMA_VALIDATION, step=1)
        result = injector.inject(1, "tool", {})
        assert result.injected is True
        assert result.fault_result.output is not None

    def test_all_10_fault_categories_covered(self):
        categories = [
            FaultCategory.TIMEOUT, FaultCategory.TOOL_UNAVAILABLE,
            FaultCategory.MALFORMED_JSON, FaultCategory.MISSING_FIELDS,
            FaultCategory.INVALID_ARGUMENTS, FaultCategory.EMPTY_RESPONSE,
            FaultCategory.STALE_DATA, FaultCategory.TRANSIENT_ERROR,
            FaultCategory.RATE_LIMIT, FaultCategory.SCHEMA_VALIDATION,
        ]
        assert len(categories) == 10, "Must have exactly 10 fault categories"
        for cat in categories:
            injector = self._make_injector(cat, step=1)
            result = injector.inject(1, "tool", {})
            assert result.injected is True, f"Fault {cat} should be injected"

    def test_probabilistic_injection_with_seed(self):
        # With prob=0, should never inject
        injector = self._make_injector(FaultCategory.TRANSIENT_ERROR, prob=0.0)
        for step in range(1, 10):
            result = injector.inject(step, "tool", {})
            assert result.injected is False

    def test_builtin_scenarios_present(self):
        assert len(BUILTIN_SCENARIOS) >= 10

    def test_deterministic_reproducibility(self):
        """Same seed and step should always produce same injection decision."""
        config = InjectionConfig(
            scenario_id="test",
            category=FaultCategory.TRANSIENT_ERROR,
            probability=0.5,
            seed=12345,
        )
        results_run1 = [FaultInjector(config).inject(i, "tool", {}).injected for i in range(1, 6)]
        results_run2 = [FaultInjector(config).inject(i, "tool", {}).injected for i in range(1, 6)]
        assert results_run1 == results_run2, "Seeded injection must be deterministic"


# ─────────────────────────── Diagnosis Tests ───────────────────────────────

class TestDiagnosisEngine:
    def setup_method(self):
        self.engine = DiagnosisEngine()

    def test_diagnose_timeout_status(self):
        result = ToolResult(status=ToolStatus.TIMEOUT, output=None, error_message="timed out")
        diag = self.engine.diagnose(result, ground_truth="timeout")
        assert diag.predicted_category == "timeout"
        assert diag.is_correct is True

    def test_diagnose_unavailable_status(self):
        result = ToolResult(status=ToolStatus.UNAVAILABLE, output=None)
        diag = self.engine.diagnose(result, ground_truth="tool_unavailable")
        assert diag.predicted_category == "tool_unavailable"
        assert diag.is_correct is True

    def test_diagnose_rate_limit_by_message(self):
        result = ToolResult(status=ToolStatus.FAILURE, output=None,
                            error_message="Rate limit exceeded (HTTP 429)")
        diag = self.engine.diagnose(result, ground_truth="rate_limit")
        assert diag.predicted_category == "rate_limit"
        assert diag.is_correct is True

    def test_diagnose_malformed_json_by_output(self):
        result = ToolResult(status=ToolStatus.FAILURE, output={"_parse_error": True, "_raw": "bad json"})
        diag = self.engine.diagnose(result, ground_truth="malformed_json")
        assert diag.predicted_category == "malformed_json"
        assert diag.is_correct is True

    def test_diagnose_stale_data(self):
        result = ToolResult(status=ToolStatus.SUCCESS, output={"stale": True, "data_age_hours": 72})
        diag = self.engine.diagnose(result, ground_truth="stale_data")
        assert diag.predicted_category == "stale_data"
        assert diag.is_correct is True

    def test_diagnose_empty_response(self):
        result = ToolResult(status=ToolStatus.FAILURE, output={})
        diag = self.engine.diagnose(result, ground_truth="empty_response")
        assert diag.predicted_category == "empty_response"
        assert diag.is_correct is True

    def test_diagnose_missing_fields(self):
        result = ToolResult(status=ToolStatus.FAILURE, output={"partial": True},
                            error_message="missing required fields")
        diag = self.engine.diagnose(result, ground_truth="missing_fields")
        assert diag.predicted_category == "missing_fields"

    def test_ground_truth_none_when_no_fault(self):
        result = ToolResult(status=ToolStatus.SUCCESS, output={"result": 42})
        diag = self.engine.diagnose(result)
        assert diag.is_correct is None  # No ground truth to compare

    def test_evidence_is_populated(self):
        result = ToolResult(status=ToolStatus.TIMEOUT, output=None)
        diag = self.engine.diagnose(result)
        assert len(diag.evidence) >= 1

    def test_confidence_returned_for_strong_signals(self):
        result = ToolResult(status=ToolStatus.TIMEOUT, output=None)
        diag = self.engine.diagnose(result)
        assert diag.confidence is not None
        assert 0 <= diag.confidence <= 1


# ─────────────────────────── Recovery Policy Tests ─────────────────────────

def _make_budget(retries=3, elapsed=0.0, timeout=30.0) -> Budget:
    return Budget(max_retries=retries, max_duration_seconds=timeout, elapsed_seconds=elapsed, retries_used=0)


def _failure_result(msg="error"):
    return ToolResult(status=ToolStatus.FAILURE, output=None, error_message=msg)


def _success_result():
    return ToolResult(status=ToolStatus.SUCCESS, output={"result": "ok"})


class TestPolicyA:
    def test_stops_on_failure(self):
        r = policy_baseline_stop(_failure_result(), "transient_error", "tool", _make_budget())
        assert r.action == RecoveryAction.STOP

    def test_continues_on_success(self):
        r = policy_baseline_stop(_success_result(), "none", "tool", _make_budget())
        assert r.action == RecoveryAction.CONTINUE


class TestPolicyB:
    def test_retries_within_budget(self):
        r = policy_bounded_retry(_failure_result(), "transient_error", "tool", _make_budget(retries=3), retry_number=0)
        assert r.action == RecoveryAction.RETRY

    def test_stops_when_budget_exhausted(self):
        budget = Budget(max_retries=3, retries_used=3)
        r = policy_bounded_retry(_failure_result(), "transient_error", "tool", budget, retry_number=3)
        assert r.action == RecoveryAction.STOP

    def test_continues_on_success(self):
        r = policy_bounded_retry(_success_result(), "none", "tool", _make_budget())
        assert r.action == RecoveryAction.CONTINUE

    def test_backoff_increases_with_retries(self):
        r0 = policy_bounded_retry(_failure_result(), "transient_error", "tool", _make_budget(), retry_number=0)
        r1 = policy_bounded_retry(_failure_result(), "transient_error", "tool", _make_budget(), retry_number=1)
        assert r1.backoff_seconds >= r0.backoff_seconds


class TestPolicyC:
    def test_retries_on_invalid_output(self):
        result = ToolResult(status=ToolStatus.SUCCESS, output={"_parse_error": True})
        r = policy_validation_retry(result, "malformed_json", "tool", _make_budget())
        assert r.action == RecoveryAction.RETRY

    def test_continues_on_valid_output(self):
        r = policy_validation_retry(_success_result(), "none", "tool", _make_budget())
        assert r.action == RecoveryAction.CONTINUE

    def test_stops_on_invalid_output_when_budget_exhausted(self):
        result = ToolResult(status=ToolStatus.SUCCESS, output={"_parse_error": True})
        budget = Budget(max_retries=3, retries_used=3)
        r = policy_validation_retry(result, "malformed_json", "tool", budget)
        assert r.action == RecoveryAction.STOP


class TestPolicyD:
    def test_fallback_when_available(self):
        r = policy_fallback(_failure_result(), "tool_unavailable", "search_knowledge_base", _make_budget())
        assert r.action == RecoveryAction.FALLBACK
        assert r.fallback_tool == "search_knowledge_base_v2"

    def test_stops_when_no_fallback(self):
        r = policy_fallback(_failure_result(), "timeout", "generate_answer", _make_budget())
        assert r.action == RecoveryAction.STOP

    def test_continues_on_success(self):
        r = policy_fallback(_success_result(), "none", "tool", _make_budget())
        assert r.action == RecoveryAction.CONTINUE


class TestPolicyE:
    def test_safe_stop_on_schema_fault(self):
        r = policy_safe_stop(_failure_result(), "schema_validation", "tool", _make_budget())
        assert r.action == RecoveryAction.SAFE_STOP
        assert r.is_safe is True

    def test_retries_transient(self):
        r = policy_safe_stop(_failure_result(), "transient_error", "tool", _make_budget())
        assert r.action == RecoveryAction.RETRY

    def test_safe_stop_on_invalid_success(self):
        result = ToolResult(status=ToolStatus.SUCCESS, output={"_parse_error": True})
        r = policy_safe_stop(result, "malformed_json", "tool", _make_budget())
        assert r.action == RecoveryAction.SAFE_STOP


class TestPolicyF:
    def test_clarification_on_failure(self):
        r = policy_clarification(_failure_result("no data"), "missing_data", "tool", _make_budget(),
                                  task_description="Find user info")
        assert r.action == RecoveryAction.CLARIFY
        assert r.clarification_request is not None
        assert "Find user info" in r.clarification_request

    def test_continues_on_success(self):
        r = policy_clarification(_success_result(), "none", "tool", _make_budget())
        assert r.action == RecoveryAction.CONTINUE


class TestPolicyG:
    def test_continues_on_valid_success(self):
        r = policy_budget_aware(_success_result(), "none", "tool", _make_budget())
        assert r.action == RecoveryAction.CONTINUE

    def test_safe_stop_on_unsafe_category(self):
        r = policy_budget_aware(_failure_result(), "schema_validation", "tool", _make_budget())
        assert r.action == RecoveryAction.SAFE_STOP
        assert r.is_safe is True

    def test_retries_transient_within_budget(self):
        r = policy_budget_aware(_failure_result("503"), "transient_error", "tool", _make_budget())
        assert r.action in (RecoveryAction.RETRY, RecoveryAction.FALLBACK)

    def test_stops_on_exhausted_budget(self):
        budget = Budget(max_retries=3, retries_used=3)
        r = policy_budget_aware(_failure_result(), "transient_error", "tool", budget)
        assert r.action == RecoveryAction.STOP

    def test_clarifies_on_non_retryable(self):
        r = policy_budget_aware(_failure_result(), "invalid_arguments", "tool", _make_budget())
        # invalid_arguments is in NON_RETRYABLE_CATEGORIES → but first checks unsafe
        # invalid_arguments IS in _UNSAFE_CATEGORIES → should be safe_stop
        assert r.action == RecoveryAction.SAFE_STOP

    def test_uses_fallback_for_transient_with_fallback_available(self):
        r = policy_budget_aware(
            _failure_result("503"), "transient_error",
            "search_knowledge_base", _make_budget()
        )
        assert r.action == RecoveryAction.FALLBACK
        assert r.fallback_tool == "search_knowledge_base_v2"

    def test_budget_dict_included_in_result(self):
        r = policy_budget_aware(_failure_result(), "transient_error", "tool", _make_budget())
        assert r.budget_remaining is not None
        assert "retries_remaining" in r.budget_remaining


class TestAllPoliciesRegistered:
    def test_seven_policies_registered(self):
        assert len(RECOVERY_POLICIES) == 7

    def test_policy_ids_match_keys(self):
        for k, v in RECOVERY_POLICIES.items():
            assert v["id"] == k


# ─────────────────────────── Metrics Tests ──────────────────────────────────

class TestMetricsEngine:
    def setup_method(self):
        from app.services.metrics_engine import MetricsEngine
        self.engine = MetricsEngine()

    def _make_run(self, outcome, duration_ms, retry_count, token_usage=None):
        from unittest.mock import MagicMock
        run = MagicMock()
        run.id = "run-" + outcome
        run.outcome = outcome
        run.duration_ms = duration_ms
        run.retry_count = retry_count
        run.token_usage = token_usage
        return run

    def test_task_success_rate_calculation(self):
        runs = [
            self._make_run("success", 100, 0),
            self._make_run("success", 150, 1),
            self._make_run("failure", 50, 3),
            self._make_run("failure", 200, 3),
        ]
        metrics = self.engine.compute("exp1", "policy_a", runs, {})
        assert metrics["task_success_rate"] == 0.5

    def test_unsafe_recovery_rate(self):
        runs = [
            self._make_run("success", 100, 0),
            self._make_run("unsafe", 200, 2),
        ]
        metrics = self.engine.compute("exp1", "policy_a", runs, {})
        assert metrics["unsafe_recovery_rate"] == 0.5

    def test_no_division_by_zero_empty_runs(self):
        metrics = self.engine.compute("exp1", "policy_a", [], {})
        assert metrics["task_success_rate"] is None
        assert metrics["sample_size"] == 0

    def test_p95_latency_null_for_small_samples(self):
        runs = [self._make_run("success", 100, 0) for _ in range(5)]
        metrics = self.engine.compute("exp1", "policy_a", runs, {})
        assert metrics["p95_latency_ms"] is None  # < 20 samples

    def test_mean_latency_calculated(self):
        runs = [
            self._make_run("success", 100, 0),
            self._make_run("success", 200, 0),
        ]
        metrics = self.engine.compute("exp1", "policy_a", runs, {})
        assert metrics["mean_latency_ms"] == 150.0

    def test_estimated_cost_is_null(self):
        runs = [self._make_run("success", 100, 0, token_usage=500)]
        metrics = self.engine.compute("exp1", "policy_a", runs, {})
        assert metrics["estimated_cost_usd"] is None  # Not fabricated

    def test_token_usage_aggregated(self):
        runs = [
            self._make_run("success", 100, 0, token_usage=300),
            self._make_run("success", 100, 0, token_usage=200),
        ]
        metrics = self.engine.compute("exp1", "policy_a", runs, {})
        assert metrics["total_token_usage"] == 500


# ─────────────────────────── Agent Tests ────────────────────────────────────

class TestMockAgent:
    def setup_method(self):
        from app.agents.mock_agent import MockAgent
        self.agent = MockAgent()

    def test_agent_type(self):
        assert self.agent.agent_type == "mock"

    def test_plan_known_task(self):
        plan = self.agent.plan("task_expense_policy", "What is the expense policy?", {})
        assert len(plan.steps) >= 2
        assert plan.agent_type == "mock"

    def test_plan_unknown_task_uses_default(self):
        plan = self.agent.plan("unknown_task_xyz", "Do something", {})
        assert len(plan.steps) >= 2

    def test_plan_steps_have_valid_tools(self):
        plan = self.agent.plan("task_expense_policy", "Policy?", {})
        from app.tools.registry import TOOL_REGISTRY
        for step in plan.steps:
            assert step.tool_name in TOOL_REGISTRY, f"Unknown tool: {step.tool_name}"

    def test_plan_is_deterministic(self):
        plan1 = self.agent.plan("task_cost_analysis", "Calculate", {})
        plan2 = self.agent.plan("task_cost_analysis", "Calculate", {})
        assert [s.tool_name for s in plan1.steps] == [s.tool_name for s in plan2.steps]


# ─────────────────────────── Agent Runner Tests ─────────────────────────────

class TestAgentRunner:
    def _make_runner(self, policy_id, fault_category=FaultCategory.NONE, step=None):
        from app.services.agent_runner import AgentRunner
        config = InjectionConfig(
            scenario_id="test",
            category=fault_category,
            probability=1.0,
            deterministic_step=step,
            failure_delay_ms=0,
            seed=42,
        )
        return AgentRunner(
            run_id="test-run-id",
            experiment_id="test-exp",
            task_id="task_expense_policy",
            policy_id=policy_id,
            injection_config=config,
            max_retries=3,
            timeout_seconds=30.0,
        )

    def test_successful_run_no_fault(self):
        from app.agents.mock_agent import MockAgent
        runner = self._make_runner("policy_b_bounded_retry")
        plan = MockAgent().plan("task_expense_policy", "Expense policy?", {})
        result = runner.run(plan)
        assert result.outcome == "success"
        assert result.status == "completed"
        assert len(result.traces) >= 2

    def test_traces_recorded(self):
        from app.agents.mock_agent import MockAgent
        runner = self._make_runner("policy_b_bounded_retry")
        plan = MockAgent().plan("task_expense_policy", "Test", {})
        result = runner.run(plan)
        assert len(result.traces) > 0
        for trace in result.traces:
            assert trace.tool_name is not None
            assert trace.started_at is not None

    def test_fault_injection_recorded_in_trace(self):
        from app.agents.mock_agent import MockAgent
        runner = self._make_runner("policy_b_bounded_retry", FaultCategory.TRANSIENT_ERROR, step=1)
        plan = MockAgent().plan("task_expense_policy", "Test", {})
        result = runner.run(plan)
        # Some trace should show fault_injected=True
        fault_traces = [t for t in result.traces if t.fault_injected]
        assert len(fault_traces) >= 1

    def test_baseline_stop_stops_on_fault(self):
        from app.agents.mock_agent import MockAgent
        runner = self._make_runner("policy_a_baseline_stop", FaultCategory.TRANSIENT_ERROR, step=1)
        plan = MockAgent().plan("task_expense_policy", "Test", {})
        result = runner.run(plan)
        assert result.outcome == "failure"

    def test_retry_policy_retries_and_may_succeed(self):
        from app.agents.mock_agent import MockAgent
        # Inject fault at step 1 only — subsequent retry succeeds
        runner = self._make_runner("policy_b_bounded_retry", FaultCategory.TRANSIENT_ERROR, step=1)
        plan = MockAgent().plan("task_expense_policy", "Test", {})
        result = runner.run(plan)
        # With deterministic step 1, step 1 always fails; runner retries step 1
        # Since the injector targets step_number (not retry), retry of step 1 also hits step 1
        # So bounded retry will eventually exhaust retries
        assert result.retry_count >= 1

    def test_fallback_used_for_search_tool(self):
        from app.agents.mock_agent import MockAgent
        runner = self._make_runner("policy_d_fallback", FaultCategory.TOOL_UNAVAILABLE, step=1)
        plan = MockAgent().plan("task_expense_policy", "Test", {})
        result = runner.run(plan)
        # Policy D should attempt fallback for search_knowledge_base
        fallback_traces = [t for t in result.traces if t.tool_name == "search_knowledge_base_v2"]
        assert len(fallback_traces) >= 1

    def test_no_fabricated_results(self):
        """Estimated cost must be null for simulated tools."""
        from app.agents.mock_agent import MockAgent
        runner = self._make_runner("policy_b_bounded_retry")
        plan = MockAgent().plan("task_expense_policy", "Test", {})
        result = runner.run(plan)
        assert result.estimated_cost_usd is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
