"""
Agent Runner — executes an agent's plan with fault injection and recovery.

Records a full execution trace for every step:
  - Tool call inputs and outputs
  - Fault injection events
  - Diagnosis results
  - Recovery decisions
  - Timing and token usage
"""
from __future__ import annotations
import time
import uuid
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.agents.base_agent import AgentPlan, AgentStep
from app.services.fault_injector import FaultInjector, InjectionConfig, FaultCategory, InjectionResult
from app.services.diagnosis_engine import DiagnosisEngine, DiagnosisResult
from app.services.recovery_engine import (
    Budget, RecoveryDecisionResult, RecoveryAction,
    get_policy_handler, RECOVERY_POLICIES
)
from app.tools.registry import execute_tool, ToolResult, ToolStatus

logger = logging.getLogger(__name__)


@dataclass
class TraceStep:
    id: str
    run_id: str
    step_number: int
    tool_name: str
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]]
    status: str
    fault_injected: bool
    fault_category: Optional[str]
    diagnosis_category: Optional[str]
    recovery_action: Optional[str]
    retry_number: int
    started_at: datetime
    ended_at: Optional[datetime]
    latency_ms: Optional[int]
    token_usage: Optional[int]


@dataclass
class RecoveryRecord:
    id: str
    trace_id: Optional[str]
    run_id: str
    policy_id: str
    decision: str
    reason: str
    budget_remaining: Optional[Dict[str, Any]]
    outcome: Optional[str]
    created_at: datetime


@dataclass
class RunResult:
    run_id: str
    experiment_id: str
    task_id: str
    policy_id: str
    scenario_id: str
    seed: int
    status: str                  # pending | running | completed | failed
    outcome: str                 # success | failure | partial | unsafe | clarification_needed
    started_at: datetime
    completed_at: Optional[datetime]
    duration_ms: Optional[int]
    retry_count: int
    token_usage: Optional[int]
    estimated_cost_usd: Optional[float]
    error_message: Optional[str]
    traces: List[TraceStep] = field(default_factory=list)
    recovery_decisions: List[RecoveryRecord] = field(default_factory=list)
    config_snapshot: Dict[str, Any] = field(default_factory=dict)


class AgentRunner:
    """
    Executes an agent plan with fault injection, diagnosis, and recovery.

    Guarantees:
    - Every step is recorded in the trace
    - No fabricated results
    - Retry loops are bounded by the budget
    - Safety constraints are always respected
    - Sensitive field values are not logged
    """

    def __init__(
        self,
        run_id: str,
        experiment_id: str,
        task_id: str,
        policy_id: str,
        injection_config: InjectionConfig,
        max_retries: int = 3,
        timeout_seconds: float = 30.0,
        token_budget: Optional[int] = None,
        cost_budget_usd: Optional[float] = None,
    ):
        self.run_id = run_id
        self.experiment_id = experiment_id
        self.task_id = task_id
        self.policy_id = policy_id
        self.injector = FaultInjector(injection_config)
        self.scenario_id = injection_config.scenario_id
        self.seed = injection_config.seed or 0
        self.diagnoser = DiagnosisEngine()
        self.policy_handler = get_policy_handler(policy_id)
        self.budget = Budget(
            max_retries=max_retries,
            max_duration_seconds=timeout_seconds,
            token_budget=token_budget,
            cost_budget_usd=cost_budget_usd,
        )

    def run(self, plan: AgentPlan) -> RunResult:
        started_at = datetime.now(timezone.utc)
        run_start_time = time.perf_counter()
        traces: List[TraceStep] = []
        recovery_decisions: List[RecoveryRecord] = []
        total_tokens = 0
        final_outcome = "failure"
        error_message = None

        logger.info(
            "AgentRunner starting run_id=%s task=%s policy=%s scenario=%s",
            self.run_id, self.task_id, self.policy_id, self.scenario_id,
        )

        step_number = 0
        steps_queue = list(plan.steps)

        while steps_queue:
            step = steps_queue.pop(0)
            step_number += 1
            retry_number = 0
            step_completed = False

            while not step_completed:
                # Update elapsed time in budget
                self.budget.elapsed_seconds = time.perf_counter() - run_start_time

                # Check time budget before executing
                if not self.budget.within_time_budget:
                    error_message = f"Execution time budget exceeded ({self.budget.elapsed_seconds:.1f}s)"
                    final_outcome = "failure"
                    self._record_recovery(
                        recovery_decisions, trace_id=None,
                        decision=RecoveryAction.STOP,
                        reason=error_message,
                    )
                    steps_queue.clear()
                    step_completed = True
                    break

                # ── Fault injection ──────────────────────────────────────────
                step_start = time.perf_counter()
                injection: InjectionResult = self.injector.inject(step_number, step.tool_name, step.tool_inputs)

                if injection.injected:
                    tool_result = injection.fault_result
                    fault_category = injection.category.value
                    logger.debug("Fault injected: %s at step %d", fault_category, step_number)
                else:
                    # ── Normal tool execution ────────────────────────────────
                    tool_result = execute_tool(step.tool_name, step.tool_inputs)
                    fault_category = FaultCategory.NONE.value

                step_end = time.perf_counter()
                latency_ms = int((step_end - step_start) * 1000)

                # Track token usage (only real values — never fabricated)
                if tool_result.token_usage:
                    total_tokens += tool_result.token_usage
                    self.budget.tokens_used += tool_result.token_usage

                # ── Diagnosis ───────────────────────────────────────────────
                ground_truth = fault_category if injection.injected else None
                diagnosis: DiagnosisResult = self.diagnoser.diagnose(
                    tool_result,
                    ground_truth=ground_truth,
                    tool_name=step.tool_name,
                    step_number=step_number,
                )

                # ── Record trace step ────────────────────────────────────────
                trace_id = str(uuid.uuid4())
                trace_step = TraceStep(
                    id=trace_id,
                    run_id=self.run_id,
                    step_number=step_number,
                    tool_name=step.tool_name,
                    input_data=self._redact(step.tool_inputs),
                    output_data=self._redact(tool_result.output) if tool_result.output else None,
                    status=tool_result.status.value,
                    fault_injected=injection.injected,
                    fault_category=fault_category if injection.injected else None,
                    diagnosis_category=diagnosis.predicted_category,
                    recovery_action=None,  # filled after recovery decision
                    retry_number=retry_number,
                    started_at=datetime.fromtimestamp(step_start, tz=timezone.utc),
                    ended_at=datetime.fromtimestamp(step_end, tz=timezone.utc),
                    latency_ms=latency_ms,
                    token_usage=tool_result.token_usage,
                )

                # ── Recovery decision ────────────────────────────────────────
                if tool_result.status != ToolStatus.SUCCESS or injection.injected:
                    recovery: RecoveryDecisionResult = self.policy_handler(
                        tool_result=tool_result,
                        fault_category=fault_category,
                        tool_name=step.tool_name,
                        budget=self.budget,
                        retry_number=retry_number,
                        task_description=plan.task_description,
                    )
                    trace_step.recovery_action = recovery.action.value

                    recovery_rec = self._record_recovery(
                        recovery_decisions,
                        trace_id=trace_id,
                        decision=recovery.action,
                        reason=recovery.reason,
                        budget_remaining=recovery.budget_remaining,
                    )

                    # ── Act on recovery decision ─────────────────────────────
                    if recovery.action == RecoveryAction.RETRY:
                        self.budget.retries_used += 1
                        retry_number += 1
                        if recovery.backoff_seconds > 0:
                            time.sleep(min(recovery.backoff_seconds, 2.0))  # cap sleep in tests
                        traces.append(trace_step)
                        continue  # retry this step

                    elif recovery.action == RecoveryAction.FALLBACK and recovery.fallback_tool:
                        # Insert fallback step at front of queue
                        fallback_step = AgentStep(
                            tool_name=recovery.fallback_tool,
                            tool_inputs=step.tool_inputs,
                            reasoning=f"Fallback for failed '{step.tool_name}'",
                        )
                        steps_queue.insert(0, fallback_step)
                        traces.append(trace_step)
                        step_completed = True

                    elif recovery.action in (RecoveryAction.STOP, RecoveryAction.SAFE_STOP):
                        if not recovery.is_safe:
                            final_outcome = "unsafe"
                        else:
                            final_outcome = "failure"
                        error_message = recovery.reason
                        steps_queue.clear()
                        traces.append(trace_step)
                        step_completed = True

                    elif recovery.action == RecoveryAction.CLARIFY:
                        final_outcome = "clarification_needed"
                        error_message = recovery.clarification_request
                        steps_queue.clear()
                        traces.append(trace_step)
                        step_completed = True

                    elif recovery.action == RecoveryAction.CONTINUE:
                        # Tool succeeded despite injection (e.g. stale data)
                        traces.append(trace_step)
                        step_completed = True
                else:
                    # Tool succeeded — no recovery needed
                    trace_step.recovery_action = RecoveryAction.CONTINUE.value
                    traces.append(trace_step)
                    step_completed = True

        # ── Determine final outcome ──────────────────────────────────────────
        if not error_message and final_outcome == "failure":
            # All steps completed without stopping → success
            final_outcome = "success"

        completed_at = datetime.now(timezone.utc)
        duration_ms = int((time.perf_counter() - run_start_time) * 1000)

        logger.info(
            "AgentRunner completed run_id=%s outcome=%s duration_ms=%d retries=%d",
            self.run_id, final_outcome, duration_ms, self.budget.retries_used,
        )

        return RunResult(
            run_id=self.run_id,
            experiment_id=self.experiment_id,
            task_id=self.task_id,
            policy_id=self.policy_id,
            scenario_id=self.scenario_id,
            seed=self.seed,
            status="completed",
            outcome=final_outcome,
            started_at=started_at,
            completed_at=completed_at,
            duration_ms=duration_ms,
            retry_count=self.budget.retries_used,
            token_usage=total_tokens if total_tokens > 0 else None,
            estimated_cost_usd=None,  # Not fabricated — only set when real pricing data available
            error_message=error_message,
            traces=traces,
            recovery_decisions=recovery_decisions,
            config_snapshot={
                "policy_id": self.policy_id,
                "scenario_id": self.scenario_id,
                "max_retries": self.budget.max_retries,
                "timeout_seconds": self.budget.max_duration_seconds,
                "token_budget": self.budget.token_budget,
                "cost_budget_usd": self.budget.cost_budget_usd,
            },
        )

    def _record_recovery(
        self,
        decisions: List[RecoveryRecord],
        trace_id: Optional[str],
        decision: RecoveryAction,
        reason: str,
        budget_remaining: Optional[Dict[str, Any]] = None,
        outcome: Optional[str] = None,
    ) -> RecoveryRecord:
        rec = RecoveryRecord(
            id=str(uuid.uuid4()),
            trace_id=trace_id,
            run_id=self.run_id,
            policy_id=self.policy_id,
            decision=decision.value,
            reason=reason,
            budget_remaining=budget_remaining or self.budget.to_dict(),
            outcome=outcome,
            created_at=datetime.now(timezone.utc),
        )
        decisions.append(rec)
        return rec

    @staticmethod
    def _redact(data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Redact known sensitive keys from stored data."""
        if data is None:
            return None
        SENSITIVE_KEYS = {"password", "api_key", "token", "secret", "key", "credential"}
        return {
            k: "[REDACTED]" if k.lower() in SENSITIVE_KEYS else v
            for k, v in data.items()
        }
