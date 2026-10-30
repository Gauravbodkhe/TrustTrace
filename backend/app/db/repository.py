"""
Database Repository — all database read/write operations.
Abstracts SQLAlchemy sessions from the business layer.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select, func, update
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Experiment, ExperimentRun, ExecutionTrace,
    RecoveryDecision, FaultScenario, Task, MetricSummary, SampleTestCase
)
from app.services.agent_runner import RunResult, TraceStep, RecoveryRecord


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ─────────────────────────── Tasks ─────────────────────────────────────────

def seed_benchmark_tasks(db: Session) -> int:
    """Insert benchmark tasks if they don't exist. Returns count inserted."""
    from app.db.benchmark_data import BENCHMARK_TASKS
    inserted = 0
    for task_data in BENCHMARK_TASKS:
        existing = db.get(Task, task_data["id"])
        if existing is None:
            task = Task(**task_data)
            db.add(task)
            inserted += 1
    db.flush()
    return inserted


def get_task(db: Session, task_id: str) -> Optional[Task]:
    return db.get(Task, task_id)


def list_tasks(db: Session, benchmark_only: bool = False) -> List[Task]:
    stmt = select(Task)
    if benchmark_only:
        stmt = stmt.where(Task.is_benchmark == True)
    result = db.execute(stmt)
    return list(result.scalars().all())


# ─────────────────────────── Fault Scenarios ───────────────────────────────

def seed_scenarios(db: Session) -> int:
    """Insert built-in fault scenarios if they don't exist."""
    from app.services.fault_injector import BUILTIN_SCENARIOS
    inserted = 0
    for scenario_data in BUILTIN_SCENARIOS.values():
        existing = db.get(FaultScenario, scenario_data["id"])
        if existing is None:
            scenario = FaultScenario(**scenario_data)
            db.add(scenario)
            inserted += 1
    db.flush()
    return inserted


def get_scenario(db: Session, scenario_id: str) -> Optional[FaultScenario]:
    return db.get(FaultScenario, scenario_id)


def list_scenarios(db: Session) -> List[FaultScenario]:
    result = db.execute(select(FaultScenario))
    return list(result.scalars().all())


def create_scenario(db: Session, data: Any) -> FaultScenario:
    payload = data.model_dump() if hasattr(data, "model_dump") else dict(data)
    scenario_id = payload.get("id") or f"custom_{str(uuid.uuid4())[:8]}"
    scenario = FaultScenario(id=scenario_id, **{k: v for k, v in payload.items() if k != "id"})
    db.add(scenario)
    db.flush()
    return scenario


# ─────────────────────────── Sample Test Cases ─────────────────────────────

SAMPLE_TEST_CASES = [
    {
        "id": "TC-001",
        "name": "API Timeout",
        "description": "Simulates external API call timeout at step 1. Evaluates bounded exponential backoff retry within budget.",
        "fault_category": "timeout",
        "scenario_id": "timeout_step1",
        "expected_recovery": "Bounded Retry",
        "recommended_policy_id": "policy_b_bounded_retry",
        "task_ids": ["task_expense_policy"],
        "default_params": {"repetitions": 1, "seed": 42, "max_retries": 3, "timeout_seconds": 30},
        "is_sample": True,
    },
    {
        "id": "TC-002",
        "name": "Tool Unavailable",
        "description": "Simulates complete service outage (HTTP 503) at step 2. Evaluates dynamic failover to registered backup tool.",
        "fault_category": "tool_unavailable",
        "scenario_id": "tool_unavailable_step2",
        "expected_recovery": "Fallback",
        "recommended_policy_id": "policy_d_fallback",
        "task_ids": ["task_order_lookup"],
        "default_params": {"repetitions": 1, "seed": 42, "max_retries": 3, "timeout_seconds": 30},
        "is_sample": True,
    },
    {
        "id": "TC-003",
        "name": "Malformed JSON",
        "description": "Tool returns corrupt or unparseable JSON syntax at step 1. Evaluates parser validation and retry.",
        "fault_category": "malformed_json",
        "scenario_id": "malformed_json_step1",
        "expected_recovery": "Validation and Retry",
        "recommended_policy_id": "policy_c_validation_retry",
        "task_ids": ["task_expense_policy"],
        "default_params": {"repetitions": 1, "seed": 42, "max_retries": 3, "timeout_seconds": 30},
        "is_sample": True,
    },
    {
        "id": "TC-004",
        "name": "Missing Fields",
        "description": "Tool returns partial payload missing required keys at step 2. Evaluates schema validation failure detection.",
        "fault_category": "missing_fields",
        "scenario_id": "missing_fields_step2",
        "expected_recovery": "Validation",
        "recommended_policy_id": "policy_c_validation_retry",
        "task_ids": ["task_order_lookup"],
        "default_params": {"repetitions": 1, "seed": 42, "max_retries": 3, "timeout_seconds": 30},
        "is_sample": True,
    },
    {
        "id": "TC-005",
        "name": "Invalid Arguments",
        "description": "Agent supplies invalid parameter types to tool at step 1. Evaluates safe stop to prevent downstream corruption.",
        "fault_category": "invalid_arguments",
        "scenario_id": "invalid_args_step1",
        "expected_recovery": "Safe Stop",
        "recommended_policy_id": "policy_e_safe_stop",
        "task_ids": ["task_cost_analysis"],
        "default_params": {"repetitions": 1, "seed": 42, "max_retries": 3, "timeout_seconds": 30},
        "is_sample": True,
    },
    {
        "id": "TC-006",
        "name": "Empty Response",
        "description": "Tool returns HTTP 200 with empty body {} at step 2. Evaluates retry or secondary tool fallback.",
        "fault_category": "empty_response",
        "scenario_id": "empty_response_step2",
        "expected_recovery": "Retry or Fallback",
        "recommended_policy_id": "policy_d_fallback",
        "task_ids": ["task_order_lookup"],
        "default_params": {"repetitions": 1, "seed": 42, "max_retries": 3, "timeout_seconds": 30},
        "is_sample": True,
    },
    {
        "id": "TC-007",
        "name": "Stale Data",
        "description": "Tool returns data marked older than freshness threshold (72 hours stale). Evaluates cache invalidation.",
        "fault_category": "stale_data",
        "scenario_id": "stale_data_step1",
        "expected_recovery": "Validate Freshness",
        "recommended_policy_id": "policy_c_validation_retry",
        "task_ids": ["task_inventory_count"],
        "default_params": {"repetitions": 1, "seed": 42, "max_retries": 3, "timeout_seconds": 30},
        "is_sample": True,
    },
    {
        "id": "TC-008",
        "name": "Rate Limit",
        "description": "Tool returns HTTP 429 quota exhaustion. Evaluates budget-aware backoff respecting execution budget.",
        "fault_category": "rate_limit",
        "scenario_id": "rate_limit_step1",
        "expected_recovery": "Budget-Aware Recovery",
        "recommended_policy_id": "policy_g_budget_aware",
        "task_ids": ["task_expense_policy"],
        "default_params": {"repetitions": 1, "seed": 42, "max_retries": 3, "timeout_seconds": 30},
        "is_sample": True,
    },
    {
        "id": "TC-009",
        "name": "Authentication Failure",
        "description": "Simulates HTTP 401 Unauthorized or expired credentials at step 1. Evaluates immediate safe stop.",
        "fault_category": "auth_failure",
        "scenario_id": "auth_failure_step1",
        "expected_recovery": "Safe Stop",
        "recommended_policy_id": "policy_e_safe_stop",
        "task_ids": ["task_order_lookup"],
        "default_params": {"repetitions": 1, "seed": 42, "max_retries": 3, "timeout_seconds": 30},
        "is_sample": True,
    },
    {
        "id": "TC-010",
        "name": "Network Failure",
        "description": "Simulates socket reset (ECONNRESET) at step 1. Evaluates bounded reconnection retry.",
        "fault_category": "network_failure",
        "scenario_id": "network_failure_step1",
        "expected_recovery": "Bounded Retry",
        "recommended_policy_id": "policy_b_bounded_retry",
        "task_ids": ["task_expense_policy"],
        "default_params": {"repetitions": 1, "seed": 42, "max_retries": 3, "timeout_seconds": 30},
        "is_sample": True,
    },
]


def seed_sample_test_cases(db: Session) -> int:
    """Insert built-in sample test cases if they don't exist. Idempotent across restarts."""
    inserted = 0
    for tc_data in SAMPLE_TEST_CASES:
        existing = db.get(SampleTestCase, tc_data["id"])
        if existing is None:
            tc = SampleTestCase(**tc_data)
            db.add(tc)
            inserted += 1
    db.flush()
    return inserted


def list_sample_test_cases(db: Session, sample_only: bool = False) -> List[SampleTestCase]:
    stmt = select(SampleTestCase).order_by(SampleTestCase.id)
    if sample_only:
        stmt = stmt.where(SampleTestCase.is_sample == True)
    result = db.execute(stmt)
    return list(result.scalars().all())


def get_sample_test_case(db: Session, case_id: str) -> Optional[SampleTestCase]:
    return db.get(SampleTestCase, case_id)


def create_sample_test_case(db: Session, data: Any) -> SampleTestCase:
    payload = data.model_dump() if hasattr(data, "model_dump") else dict(data)
    case_id = payload.get("id") or f"TC-CUSTOM-{str(uuid.uuid4())[:6].upper()}"
    tc = SampleTestCase(id=case_id, **{k: v for k, v in payload.items() if k != "id"})
    db.add(tc)
    db.flush()
    return tc


def update_sample_test_case(db: Session, case_id: str, updates: Any) -> Optional[SampleTestCase]:
    tc = db.get(SampleTestCase, case_id)
    if tc is None:
        return None
    payload = updates.model_dump(exclude_unset=True) if hasattr(updates, "model_dump") else dict(updates)
    for key, val in payload.items():
        if hasattr(tc, key) and val is not None:
            setattr(tc, key, val)
    db.flush()
    return tc


def update_scenario(db: Session, scenario_id: str, updates: Any) -> Optional[FaultScenario]:
    scenario = db.get(FaultScenario, scenario_id)
    if scenario is None:
        return None
    payload = updates.model_dump(exclude_unset=True) if hasattr(updates, "model_dump") else dict(updates)
    for key, val in payload.items():
        if hasattr(scenario, key) and val is not None:
            setattr(scenario, key, val)
    db.flush()
    return scenario


# ─────────────────────────── Sample Test Cases ─────────────────────────────

SAMPLE_TEST_CASES = [
    {
        "id": "TC-001",
        "name": "API Timeout",
        "description": "Simulates external API call timeout at step 1. Evaluates bounded exponential backoff retry within budget.",
        "fault_category": "timeout",
        "scenario_id": "timeout_step1",
        "expected_recovery": "Bounded Retry",
        "recommended_policy_id": "policy_b_bounded_retry",
        "task_ids": ["task_expense_policy"],
        "default_params": {"repetitions": 1, "seed": 42, "max_retries": 3, "timeout_seconds": 30},
        "is_sample": True,
    },
    {
        "id": "TC-002",
        "name": "Tool Unavailable",
        "description": "Simulates complete service outage (HTTP 503) at step 2. Evaluates dynamic failover to registered backup tool.",
        "fault_category": "tool_unavailable",
        "scenario_id": "tool_unavailable_step2",
        "expected_recovery": "Fallback",
        "recommended_policy_id": "policy_d_fallback",
        "task_ids": ["task_order_lookup"],
        "default_params": {"repetitions": 1, "seed": 42, "max_retries": 3, "timeout_seconds": 30},
        "is_sample": True,
    },
    {
        "id": "TC-003",
        "name": "Malformed JSON",
        "description": "Tool returns corrupt or unparseable JSON syntax at step 1. Evaluates parser validation and retry.",
        "fault_category": "malformed_json",
        "scenario_id": "malformed_json_step1",
        "expected_recovery": "Validation and Retry",
        "recommended_policy_id": "policy_c_validation_retry",
        "task_ids": ["task_expense_policy"],
        "default_params": {"repetitions": 1, "seed": 42, "max_retries": 3, "timeout_seconds": 30},
        "is_sample": True,
    },
    {
        "id": "TC-004",
        "name": "Missing Fields",
        "description": "Tool returns partial payload missing required keys at step 2. Evaluates schema validation failure detection.",
        "fault_category": "missing_fields",
        "scenario_id": "missing_fields_step2",
        "expected_recovery": "Validation",
        "recommended_policy_id": "policy_c_validation_retry",
        "task_ids": ["task_order_lookup"],
        "default_params": {"repetitions": 1, "seed": 42, "max_retries": 3, "timeout_seconds": 30},
        "is_sample": True,
    },
    {
        "id": "TC-005",
        "name": "Invalid Arguments",
        "description": "Agent supplies invalid parameter types to tool at step 1. Evaluates safe stop to prevent downstream corruption.",
        "fault_category": "invalid_arguments",
        "scenario_id": "invalid_args_step1",
        "expected_recovery": "Safe Stop",
        "recommended_policy_id": "policy_e_safe_stop",
        "task_ids": ["task_cost_analysis"],
        "default_params": {"repetitions": 1, "seed": 42, "max_retries": 3, "timeout_seconds": 30},
        "is_sample": True,
    },
    {
        "id": "TC-006",
        "name": "Empty Response",
        "description": "Tool returns HTTP 200 with empty body {} at step 2. Evaluates retry or secondary tool fallback.",
        "fault_category": "empty_response",
        "scenario_id": "empty_response_step2",
        "expected_recovery": "Retry or Fallback",
        "recommended_policy_id": "policy_d_fallback",
        "task_ids": ["task_order_lookup"],
        "default_params": {"repetitions": 1, "seed": 42, "max_retries": 3, "timeout_seconds": 30},
        "is_sample": True,
    },
    {
        "id": "TC-007",
        "name": "Stale Data",
        "description": "Tool returns data marked older than freshness threshold (72 hours stale). Evaluates cache invalidation.",
        "fault_category": "stale_data",
        "scenario_id": "stale_data_step1",
        "expected_recovery": "Validate Freshness",
        "recommended_policy_id": "policy_c_validation_retry",
        "task_ids": ["task_inventory_count"],
        "default_params": {"repetitions": 1, "seed": 42, "max_retries": 3, "timeout_seconds": 30},
        "is_sample": True,
    },
    {
        "id": "TC-008",
        "name": "Rate Limit",
        "description": "Tool returns HTTP 429 quota exhaustion. Evaluates budget-aware backoff respecting execution budget.",
        "fault_category": "rate_limit",
        "scenario_id": "rate_limit_step1",
        "expected_recovery": "Budget-Aware Recovery",
        "recommended_policy_id": "policy_g_budget_aware",
        "task_ids": ["task_expense_policy"],
        "default_params": {"repetitions": 1, "seed": 42, "max_retries": 3, "timeout_seconds": 30},
        "is_sample": True,
    },
    {
        "id": "TC-009",
        "name": "Authentication Failure",
        "description": "Simulates HTTP 401 Unauthorized or expired credentials at step 1. Evaluates immediate safe stop.",
        "fault_category": "auth_failure",
        "scenario_id": "auth_failure_step1",
        "expected_recovery": "Safe Stop",
        "recommended_policy_id": "policy_e_safe_stop",
        "task_ids": ["task_order_lookup"],
        "default_params": {"repetitions": 1, "seed": 42, "max_retries": 3, "timeout_seconds": 30},
        "is_sample": True,
    },
    {
        "id": "TC-010",
        "name": "Network Failure",
        "description": "Simulates socket reset (ECONNRESET) at step 1. Evaluates bounded reconnection retry.",
        "fault_category": "network_failure",
        "scenario_id": "network_failure_step1",
        "expected_recovery": "Bounded Retry",
        "recommended_policy_id": "policy_b_bounded_retry",
        "task_ids": ["task_expense_policy"],
        "default_params": {"repetitions": 1, "seed": 42, "max_retries": 3, "timeout_seconds": 30},
        "is_sample": True,
    },
]


def seed_sample_test_cases(db: Session) -> int:
    """Insert built-in sample test cases if they don't exist. Idempotent across restarts."""
    inserted = 0
    for tc_data in SAMPLE_TEST_CASES:
        existing = db.get(SampleTestCase, tc_data["id"])
        if existing is None:
            tc = SampleTestCase(**tc_data)
            db.add(tc)
            inserted += 1
    db.flush()
    return inserted


def list_sample_test_cases(db: Session, sample_only: bool = False) -> List[SampleTestCase]:
    stmt = select(SampleTestCase).order_by(SampleTestCase.id)
    if sample_only:
        stmt = stmt.where(SampleTestCase.is_sample == True)
    result = db.execute(stmt)
    return list(result.scalars().all())


def get_sample_test_case(db: Session, case_id: str) -> Optional[SampleTestCase]:
    return db.get(SampleTestCase, case_id)


def create_sample_test_case(db: Session, data: Any) -> SampleTestCase:
    payload = data.model_dump() if hasattr(data, "model_dump") else dict(data)
    case_id = payload.get("id") or f"TC-CUSTOM-{str(uuid.uuid4())[:6].upper()}"
    tc = SampleTestCase(id=case_id, **{k: v for k, v in payload.items() if k != "id"})
    db.add(tc)
    db.flush()
    return tc


def update_sample_test_case(db: Session, case_id: str, updates: Any) -> Optional[SampleTestCase]:
    tc = db.get(SampleTestCase, case_id)
    if tc is None:
        return None
    payload = updates.model_dump(exclude_unset=True) if hasattr(updates, "model_dump") else dict(updates)
    for key, val in payload.items():
        if hasattr(tc, key) and val is not None:
            setattr(tc, key, val)
    db.flush()
    return tc


# ─────────────────────────── Experiments ───────────────────────────────────

def create_experiment(db: Session, data: Any) -> Experiment:
    payload = data.model_dump() if hasattr(data, "model_dump") else dict(data)
    exp = Experiment(
        id=payload.get("id") or str(uuid.uuid4()),
        created_at=_now(),
        updated_at=_now(),
        **{k: v for k, v in payload.items() if k != "id"},
    )
    db.add(exp)
    db.flush()
    return exp


def get_experiment(db: Session, experiment_id: str) -> Optional[Experiment]:
    result = db.execute(
        select(Experiment)
        .options(selectinload(Experiment.runs))
        .where(Experiment.id == experiment_id)
    )
    return result.scalar_one_or_none()


def list_experiments(db: Session, limit: int = 50, offset: int = 0) -> List[Experiment]:
    result = db.execute(
        select(Experiment)
        .order_by(Experiment.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


def update_experiment_status(db: Session, experiment_id: str, status: str) -> None:
    db.execute(
        update(Experiment)
        .where(Experiment.id == experiment_id)
        .values(status=status, updated_at=_now())
    )


# ─────────────────────────── Experiment Runs ───────────────────────────────

def save_run_result(
    db: Session,
    run_result: RunResult,
    run_number: int = 1,
) -> ExperimentRun:
    """Persist a completed RunResult and all its traces and recovery decisions."""
    run = ExperimentRun(
        id=run_result.run_id,
        experiment_id=run_result.experiment_id,
        task_id=run_result.task_id,
        run_number=run_number,
        policy_id=run_result.policy_id,
        scenario_id=run_result.scenario_id,
        seed=run_result.seed,
        status=run_result.status,
        outcome=run_result.outcome,
        started_at=run_result.started_at,
        completed_at=run_result.completed_at,
        duration_ms=run_result.duration_ms,
        retry_count=run_result.retry_count,
        token_usage=run_result.token_usage,
        estimated_cost_usd=run_result.estimated_cost_usd,
        error_message=run_result.error_message,
        config_snapshot=run_result.config_snapshot,
    )
    db.add(run)
    db.flush()

    for trace_step in run_result.traces:
        trace = ExecutionTrace(
            id=trace_step.id,
            run_id=trace_step.run_id,
            step_number=trace_step.step_number,
            tool_name=trace_step.tool_name,
            input_data=trace_step.input_data,
            output_data=trace_step.output_data,
            status=trace_step.status,
            fault_injected=trace_step.fault_injected,
            fault_category=trace_step.fault_category,
            diagnosis_category=trace_step.diagnosis_category,
            recovery_action=trace_step.recovery_action,
            retry_number=trace_step.retry_number,
            started_at=trace_step.started_at,
            ended_at=trace_step.ended_at,
            latency_ms=trace_step.latency_ms,
            token_usage=trace_step.token_usage,
        )
        db.add(trace)

    for rec in run_result.recovery_decisions:
        decision = RecoveryDecision(
            id=rec.id,
            trace_id=rec.trace_id,
            run_id=rec.run_id,
            policy_id=rec.policy_id,
            decision=rec.decision,
            reason=rec.reason,
            budget_remaining=rec.budget_remaining,
            outcome=rec.outcome,
            created_at=rec.created_at,
        )
        db.add(decision)

    db.flush()
    return run


def get_run(db: Session, run_id: str) -> Optional[ExperimentRun]:
    result = db.execute(
        select(ExperimentRun)
        .options(selectinload(ExperimentRun.traces))
        .options(selectinload(ExperimentRun.recovery_decisions))
        .where(ExperimentRun.id == run_id)
    )
    return result.scalar_one_or_none()


def list_runs_for_experiment(db: Session, experiment_id: str) -> List[ExperimentRun]:
    result = db.execute(
        select(ExperimentRun)
        .where(ExperimentRun.experiment_id == experiment_id)
        .order_by(ExperimentRun.run_number)
    )
    return list(result.scalars().all())


def get_traces_for_run(db: Session, run_id: str) -> List[ExecutionTrace]:
    result = db.execute(
        select(ExecutionTrace)
        .where(ExecutionTrace.run_id == run_id)
        .order_by(ExecutionTrace.step_number, ExecutionTrace.retry_number)
    )
    return list(result.scalars().all())


def get_recovery_decisions_for_run(db: Session, run_id: str) -> List[RecoveryDecision]:
    result = db.execute(
        select(RecoveryDecision).where(RecoveryDecision.run_id == run_id)
    )
    return list(result.scalars().all())


get_decisions_for_run = get_recovery_decisions_for_run


# ─────────────────────────── Metric Summaries ──────────────────────────────

def save_metric_summary(db: Session, summary: Dict[str, Any]) -> MetricSummary:
    ms = MetricSummary(id=str(uuid.uuid4()), **summary)
    db.add(ms)
    db.flush()
    return ms


def get_metric_summaries_for_experiment(
    db: Session, experiment_id: str
) -> List[MetricSummary]:
    result = db.execute(
        select(MetricSummary).where(MetricSummary.experiment_id == experiment_id)
    )
    return list(result.scalars().all())


# ─────────────────────────── Dashboard Aggregates ─────────────────────────

def get_dashboard_stats(db: Session) -> Dict[str, Any]:
    total_experiments = db.execute(select(func.count(Experiment.id))).scalar() or 0
    completed_experiments = db.execute(select(func.count(Experiment.id)).where(Experiment.status == "completed")).scalar() or 0
    total_runs = db.execute(select(func.count(ExperimentRun.id))).scalar() or 0
    total_sample_cases = db.execute(select(func.count(SampleTestCase.id))).scalar() or 0

    outcomes = db.execute(
        select(ExperimentRun.outcome, func.count(ExperimentRun.id).label("cnt"))
        .group_by(ExperimentRun.outcome)
    )
    outcome_counts = {row.outcome: row.cnt for row in outcomes if row.outcome}
    success_count = outcome_counts.get("success", 0)

    task_success_rate = (success_count / total_runs) if total_runs > 0 else None

    # Overall recovery success rate across fault-injected runs
    fault_runs_subquery = select(ExecutionTrace.run_id).where(ExecutionTrace.fault_injected == True).distinct()
    fault_runs_set = set(db.execute(fault_runs_subquery).scalars().all())
    if fault_runs_set:
        recovered_success_query = (
            select(func.count(ExperimentRun.id))
            .where(ExperimentRun.id.in_(fault_runs_set))
            .where(ExperimentRun.outcome == "success")
        )
        recovered_cnt = db.execute(recovered_success_query).scalar() or 0
        recovery_success_rate = round(recovered_cnt / len(fault_runs_set), 4)
    else:
        recovery_success_rate = None

    avg_latency = db.execute(
        select(func.avg(ExperimentRun.duration_ms))
    ).scalar()

    recent = list_experiments(db, limit=5)
    failure_stats = get_failure_distribution_stats(db)

    # Best performing policy based on highest (task_success_rate + recovery_rate)
    from app.services.recovery_engine import RECOVERY_POLICIES
    policy_metrics_rows = []
    for p_id in RECOVERY_POLICIES.keys():
        p_runs = db.execute(select(ExperimentRun).where(ExperimentRun.policy_id == p_id)).scalars().all()
        if p_runs:
            s_cnt = sum(1 for r in p_runs if r.outcome == "success")
            sr = round(s_cnt / len(p_runs), 4)
            policy_metrics_rows.append({
                "policy_id": p_id,
                "policy_name": RECOVERY_POLICIES[p_id]["name"],
                "sample_size": len(p_runs),
                "task_success_rate": sr,
            })
    
    best_policy_info = None
    if policy_metrics_rows:
        best_sorted = sorted(policy_metrics_rows, key=lambda x: x["task_success_rate"], reverse=True)
        top = best_sorted[0]
        best_policy_info = {
            "policy_id": top["policy_id"],
            "policy_name": top["policy_name"],
            "sample_size": top["sample_size"],
            "task_success_rate": top["task_success_rate"],
            "metric_description": f"Highest task completion ({top['task_success_rate']*100:.0f}%) over n={top['sample_size']} runs across all scenarios",
        }

    return {
        "total_experiments": total_experiments,
        "completed_experiments": completed_experiments,
        "total_sample_cases": total_sample_cases,
        "total_runs": total_runs,
        "task_success_rate": round(task_success_rate, 4) if task_success_rate is not None else None,
        "recovery_success_rate": recovery_success_rate,
        "avg_latency_ms": round(float(avg_latency), 1) if avg_latency else None,
        "outcome_distribution": outcome_counts,
        "recent_experiments": recent,
        "most_common_failures": failure_stats[:5],
        "best_policy": best_policy_info,
    }


def get_failure_distribution_stats(db: Session) -> list[dict]:
    """Compute incidence and recovery rates for injected fault categories."""
    traces = db.execute(
        select(ExecutionTrace.fault_category, ExecutionTrace.run_id)
        .where(ExecutionTrace.fault_injected == True)
        .where(ExecutionTrace.fault_category != None)
    ).all()

    if not traces:
        return []

    counts = {}
    fault_runs: dict[str, set] = {}
    for cat, run_id in traces:
        counts[cat] = counts.get(cat, 0) + 1
        fault_runs.setdefault(cat, set()).add(run_id)

    all_run_ids = {r for s in fault_runs.values() for r in s}
    successful_run_ids = set()
    if all_run_ids:
        successful_run_ids = set(
            db.execute(
                select(ExperimentRun.id)
                .where(ExperimentRun.id.in_(all_run_ids))
                .where(ExperimentRun.outcome == "success")
            ).scalars().all()
        )

    results = []
    for cat, cnt in sorted(counts.items(), key=lambda x: x[1], reverse=True):
        runs_for_cat = fault_runs[cat]
        recovered = len(runs_for_cat.intersection(successful_run_ids))
        rate = round(recovered / len(runs_for_cat), 4) if runs_for_cat else 0.0
        results.append({
            "category": cat,
            "count": cnt,
            "unique_runs": len(runs_for_cat),
            "recovered_runs": recovered,
            "recovery_rate": rate,
            "description": f"Simulated fault condition for {cat.replace('_', ' ')}",
        })
    return results


def list_all_runs(
    db: Session,
    experiment_id: str | None = None,
    experiment_ids: list[str] | None = None,
    policy_id: str | None = None,
    scenario_id: str | None = None,
    outcome: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[ExperimentRun]:
    """List runs across multiple or all experiments with flexible filters."""
    query = select(ExperimentRun)
    if experiment_id:
        query = query.where(ExperimentRun.experiment_id == experiment_id)
    if experiment_ids:
        query = query.where(ExperimentRun.experiment_id.in_(experiment_ids))
    if policy_id and policy_id != "all":
        query = query.where(ExperimentRun.policy_id == policy_id)
    if scenario_id and scenario_id != "all":
        query = query.where(ExperimentRun.scenario_id == scenario_id)
    if outcome and outcome != "all":
        query = query.where(ExperimentRun.outcome == outcome)

    query = query.order_by(ExperimentRun.started_at.desc().nullslast()).offset(offset).limit(limit)
    return list(db.execute(query).scalars().all())

