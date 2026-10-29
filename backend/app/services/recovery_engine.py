"""
Recovery Engine — implements all 7 recovery policies (A–G).

Each policy is a pure function that takes the current execution context
and returns a RecoveryDecision with an inspectable reason.

No policy silently fabricates results or ignores failures.
"""
from __future__ import annotations
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, List
from enum import Enum

from app.services.fault_injector import FaultCategory
from app.tools.registry import ToolResult, ToolStatus, TOOL_REGISTRY


class RecoveryAction(str, Enum):
    RETRY = "retry"
    FALLBACK = "fallback"
    STOP = "stop"
    SAFE_STOP = "safe_stop"
    CLARIFY = "clarify"
    CONTINUE = "continue"   # Used when no recovery was needed


@dataclass
class Budget:
    max_retries: int
    retries_used: int = 0
    max_duration_seconds: float = 30.0
    elapsed_seconds: float = 0.0
    token_budget: Optional[int] = None
    tokens_used: int = 0
    cost_budget_usd: Optional[float] = None
    cost_used_usd: float = 0.0

    @property
    def retries_remaining(self) -> int:
        return max(0, self.max_retries - self.retries_used)

    @property
    def time_remaining(self) -> float:
        return max(0.0, self.max_duration_seconds - self.elapsed_seconds)

    @property
    def within_retry_budget(self) -> bool:
        return self.retries_remaining > 0

    @property
    def within_time_budget(self) -> bool:
        return self.time_remaining > 0

    @property
    def within_token_budget(self) -> bool:
        if self.token_budget is None:
            return True
        return self.tokens_used < self.token_budget

    @property
    def within_cost_budget(self) -> bool:
        if self.cost_budget_usd is None:
            return True
        return self.cost_used_usd < self.cost_budget_usd

    def to_dict(self) -> Dict[str, Any]:
        return {
            "retries_remaining": self.retries_remaining,
            "time_remaining_seconds": round(self.time_remaining, 2),
            "tokens_remaining": (self.token_budget - self.tokens_used) if self.token_budget else None,
            "cost_remaining_usd": (
                round(self.cost_budget_usd - self.cost_used_usd, 6) if self.cost_budget_usd else None
            ),
        }


@dataclass
class RecoveryDecisionResult:
    action: RecoveryAction
    reason: str
    policy_id: str
    budget_remaining: Optional[Dict[str, Any]] = None
    backoff_seconds: float = 0.0
    fallback_tool: Optional[str] = None
    clarification_request: Optional[str] = None
    is_safe: bool = True


# Transient categories that are generally safe to retry
TRANSIENT_CATEGORIES = {
    FaultCategory.TRANSIENT_ERROR.value,
    FaultCategory.RATE_LIMIT.value,
    FaultCategory.TIMEOUT.value,
}

# Categories where retrying is unsafe or unlikely to help
NON_RETRYABLE_CATEGORIES = {
    FaultCategory.INVALID_ARGUMENTS.value,
    FaultCategory.MALFORMED_JSON.value,
    FaultCategory.SCHEMA_VALIDATION.value,
}


def _compute_backoff(retry_number: int, base_seconds: float = 0.5) -> float:
    """Exponential backoff: base * 2^retry, capped at 10 seconds."""
    return min(base_seconds * (2 ** retry_number), 10.0)


# ─────────────────────────── Policy A: Baseline Stop ───────────────────────

def policy_baseline_stop(
    tool_result: ToolResult,
    fault_category: str,
    tool_name: str,
    budget: Budget,
    **kwargs,
) -> RecoveryDecisionResult:
    """Policy A: Stop immediately on any tool failure."""
    if tool_result.status in (ToolStatus.SUCCESS,):
        return RecoveryDecisionResult(
            action=RecoveryAction.CONTINUE,
            reason="Tool succeeded — no recovery needed",
            policy_id="policy_a_baseline_stop",
            budget_remaining=budget.to_dict(),
        )
    return RecoveryDecisionResult(
        action=RecoveryAction.STOP,
        reason=f"Policy A (Baseline Stop): stopping on failure '{fault_category}' for tool '{tool_name}'",
        policy_id="policy_a_baseline_stop",
        budget_remaining=budget.to_dict(),
    )


# ─────────────────────────── Policy B: Bounded Retry ───────────────────────

def policy_bounded_retry(
    tool_result: ToolResult,
    fault_category: str,
    tool_name: str,
    budget: Budget,
    retry_number: int = 0,
    **kwargs,
) -> RecoveryDecisionResult:
    """Policy B: Retry transient failures up to budget.max_retries times."""
    if tool_result.status == ToolStatus.SUCCESS:
        return RecoveryDecisionResult(
            action=RecoveryAction.CONTINUE,
            reason="Tool succeeded",
            policy_id="policy_b_bounded_retry",
            budget_remaining=budget.to_dict(),
        )

    if not budget.within_retry_budget:
        return RecoveryDecisionResult(
            action=RecoveryAction.STOP,
            reason=f"Policy B: retry budget exhausted (used {budget.retries_used}/{budget.max_retries})",
            policy_id="policy_b_bounded_retry",
            budget_remaining=budget.to_dict(),
        )

    if not budget.within_time_budget:
        return RecoveryDecisionResult(
            action=RecoveryAction.STOP,
            reason=f"Policy B: time budget exhausted ({budget.elapsed_seconds:.1f}s / {budget.max_duration_seconds}s)",
            policy_id="policy_b_bounded_retry",
            budget_remaining=budget.to_dict(),
        )

    backoff = _compute_backoff(retry_number)
    return RecoveryDecisionResult(
        action=RecoveryAction.RETRY,
        reason=f"Policy B: retrying (attempt {retry_number + 1}/{budget.max_retries}) after {backoff:.1f}s backoff",
        policy_id="policy_b_bounded_retry",
        budget_remaining=budget.to_dict(),
        backoff_seconds=backoff,
    )


# ─────────────────────────── Policy C: Validation and Retry ────────────────

def _output_is_valid(tool_result: ToolResult, tool_name: str) -> tuple[bool, str]:
    """Validate tool output against expected schema fields."""
    if tool_result.status != ToolStatus.SUCCESS:
        return False, f"Tool status is {tool_result.status}"
    if tool_result.output is None:
        return False, "Output is None"
    if not tool_result.output:
        return False, "Output is empty"
    if tool_result.output.get("_parse_error"):
        return False, "Output has parse error flag"

    # Check for known invalid type patterns — only integer-typed fields
    # 'result' is excluded since it can legitimately be a string value
    NUMERIC_ONLY_FIELDS = {"count", "error_count", "total"}
    for key, val in tool_result.output.items():
        if key in NUMERIC_ONLY_FIELDS and isinstance(val, str):
            try:
                int(val)
            except ValueError:
                return False, f"Field '{key}' is string but expected integer"

    return True, "Output passed validation"


def policy_validation_retry(
    tool_result: ToolResult,
    fault_category: str,
    tool_name: str,
    budget: Budget,
    retry_number: int = 0,
    **kwargs,
) -> RecoveryDecisionResult:
    """Policy C: Validate output schema before accepting; retry if invalid."""
    is_valid, validation_msg = _output_is_valid(tool_result, tool_name)

    if is_valid:
        return RecoveryDecisionResult(
            action=RecoveryAction.CONTINUE,
            reason=f"Policy C: output validated — {validation_msg}",
            policy_id="policy_c_validation_retry",
            budget_remaining=budget.to_dict(),
        )

    if not budget.within_retry_budget:
        return RecoveryDecisionResult(
            action=RecoveryAction.STOP,
            reason=f"Policy C: validation failed ({validation_msg}), retry budget exhausted",
            policy_id="policy_c_validation_retry",
            budget_remaining=budget.to_dict(),
        )

    backoff = _compute_backoff(retry_number)
    return RecoveryDecisionResult(
        action=RecoveryAction.RETRY,
        reason=f"Policy C: validation failed ({validation_msg}) — retrying (attempt {retry_number + 1})",
        policy_id="policy_c_validation_retry",
        budget_remaining=budget.to_dict(),
        backoff_seconds=backoff,
    )


# ─────────────────────────── Policy D: Fallback ────────────────────────────

def policy_fallback(
    tool_result: ToolResult,
    fault_category: str,
    tool_name: str,
    budget: Budget,
    **kwargs,
) -> RecoveryDecisionResult:
    """Policy D: Switch to a registered fallback tool when the primary fails."""
    if tool_result.status == ToolStatus.SUCCESS:
        return RecoveryDecisionResult(
            action=RecoveryAction.CONTINUE,
            reason="Tool succeeded — no fallback needed",
            policy_id="policy_d_fallback",
            budget_remaining=budget.to_dict(),
        )

    tool_def = TOOL_REGISTRY.get(tool_name)
    fallback = tool_def.fallback_tool if tool_def else None

    if fallback and fallback in TOOL_REGISTRY:
        return RecoveryDecisionResult(
            action=RecoveryAction.FALLBACK,
            reason=f"Policy D: '{tool_name}' failed — switching to fallback tool '{fallback}'",
            policy_id="policy_d_fallback",
            budget_remaining=budget.to_dict(),
            fallback_tool=fallback,
        )

    return RecoveryDecisionResult(
        action=RecoveryAction.STOP,
        reason=f"Policy D: '{tool_name}' failed and no valid fallback is registered",
        policy_id="policy_d_fallback",
        budget_remaining=budget.to_dict(),
    )


# ─────────────────────────── Policy E: Safe Stop ───────────────────────────

_UNSAFE_CATEGORIES = {
    FaultCategory.INVALID_ARGUMENTS.value,
    FaultCategory.SCHEMA_VALIDATION.value,
    FaultCategory.MALFORMED_JSON.value,
}


def policy_safe_stop(
    tool_result: ToolResult,
    fault_category: str,
    tool_name: str,
    budget: Budget,
    **kwargs,
) -> RecoveryDecisionResult:
    """Policy E: Stop execution when continuing could produce invalid or unsafe results."""
    if tool_result.status == ToolStatus.SUCCESS:
        is_valid, msg = _output_is_valid(tool_result, tool_name)
        if not is_valid:
            return RecoveryDecisionResult(
                action=RecoveryAction.SAFE_STOP,
                reason=f"Policy E: tool returned success but output is invalid ({msg}) — safe stop",
                policy_id="policy_e_safe_stop",
                budget_remaining=budget.to_dict(),
                is_safe=True,
            )
        return RecoveryDecisionResult(
            action=RecoveryAction.CONTINUE,
            reason="Policy E: tool succeeded with valid output",
            policy_id="policy_e_safe_stop",
            budget_remaining=budget.to_dict(),
        )

    if fault_category in _UNSAFE_CATEGORIES:
        return RecoveryDecisionResult(
            action=RecoveryAction.SAFE_STOP,
            reason=(
                f"Policy E: fault category '{fault_category}' indicates data integrity risk — "
                "stopping safely to avoid propagating invalid results"
            ),
            policy_id="policy_e_safe_stop",
            budget_remaining=budget.to_dict(),
            is_safe=True,
        )

    # Transient — attempt bounded retry as safe fallback
    if fault_category in TRANSIENT_CATEGORIES and budget.within_retry_budget:
        return RecoveryDecisionResult(
            action=RecoveryAction.RETRY,
            reason=f"Policy E: transient failure '{fault_category}' — retrying safely",
            policy_id="policy_e_safe_stop",
            budget_remaining=budget.to_dict(),
            backoff_seconds=_compute_backoff(budget.retries_used),
        )

    return RecoveryDecisionResult(
        action=RecoveryAction.SAFE_STOP,
        reason=f"Policy E: cannot safely continue after failure '{fault_category}'",
        policy_id="policy_e_safe_stop",
        budget_remaining=budget.to_dict(),
        is_safe=True,
    )


# ─────────────────────────── Policy F: Clarification ───────────────────────

def policy_clarification(
    tool_result: ToolResult,
    fault_category: str,
    tool_name: str,
    budget: Budget,
    task_description: str = "",
    **kwargs,
) -> RecoveryDecisionResult:
    """Policy F: Return a structured clarification request when task cannot be safely completed."""
    if tool_result.status == ToolStatus.SUCCESS:
        return RecoveryDecisionResult(
            action=RecoveryAction.CONTINUE,
            reason="Tool succeeded — no clarification needed",
            policy_id="policy_f_clarification",
            budget_remaining=budget.to_dict(),
        )

    clarification = (
        f"The task could not be completed because tool '{tool_name}' failed "
        f"with error category '{fault_category}'. "
        f"Error: {tool_result.error_message or 'unknown'}. "
        f"Please clarify: (1) Should the task proceed with incomplete information? "
        f"(2) Is an alternative tool or data source available? "
        f"(3) Should the task be aborted? "
        f"Task context: {task_description[:200] if task_description else 'not provided'}"
    )

    return RecoveryDecisionResult(
        action=RecoveryAction.CLARIFY,
        reason=f"Policy F: requesting clarification — cannot safely proceed after '{fault_category}'",
        policy_id="policy_f_clarification",
        budget_remaining=budget.to_dict(),
        clarification_request=clarification,
    )


# ─────────────────────────── Policy G: Budget-Aware Recovery ───────────────

def policy_budget_aware(
    tool_result: ToolResult,
    fault_category: str,
    tool_name: str,
    budget: Budget,
    retry_number: int = 0,
    task_description: str = "",
    **kwargs,
) -> RecoveryDecisionResult:
    """
    Policy G: Budget-Aware Safety-Constrained Recovery.

    Decision logic (inspectable, explicit):
    1. If tool succeeded AND output is valid → continue
    2. If output is valid but tool status shows a warning (stale data) → continue with warning
    3. If fault is in _UNSAFE_CATEGORIES → safe stop (data integrity risk)
    4. If budget (retry, time, token, cost) is exhausted → stop
    5. If fault is transient AND fallback exists → use fallback (avoid retry cost)
    6. If fault is transient AND within budget → retry with backoff
    7. If fault is non-retryable → request clarification
    8. Otherwise → safe stop
    """
    policy_id = "policy_g_budget_aware"

    # ── 1. Success + valid output ────────────────────────────────────────────
    if tool_result.status == ToolStatus.SUCCESS:
        is_valid, validation_msg = _output_is_valid(tool_result, tool_name)
        if is_valid:
            stale = tool_result.output and tool_result.output.get("stale")
            return RecoveryDecisionResult(
                action=RecoveryAction.CONTINUE,
                reason=f"Policy G: success + valid output{' (stale data warning)' if stale else ''}",
                policy_id=policy_id,
                budget_remaining=budget.to_dict(),
                is_safe=True,
            )
        # Success but invalid output → treat as schema fault
        fault_category = FaultCategory.SCHEMA_VALIDATION.value

    # ── 3. Unsafe fault categories → safe stop ───────────────────────────────
    if fault_category in _UNSAFE_CATEGORIES:
        return RecoveryDecisionResult(
            action=RecoveryAction.SAFE_STOP,
            reason=(
                f"Policy G: fault '{fault_category}' indicates data integrity risk — "
                "stopping to prevent propagation of invalid results (safety constraint)"
            ),
            policy_id=policy_id,
            budget_remaining=budget.to_dict(),
            is_safe=True,
        )

    # ── 4. Budget checks ─────────────────────────────────────────────────────
    budget_issues = []
    if not budget.within_retry_budget:
        budget_issues.append(f"retry budget exhausted ({budget.retries_used}/{budget.max_retries})")
    if not budget.within_time_budget:
        budget_issues.append(f"time budget exhausted ({budget.elapsed_seconds:.1f}s)")
    if not budget.within_token_budget:
        budget_issues.append("token budget exhausted")
    if not budget.within_cost_budget:
        budget_issues.append("cost budget exhausted")

    if budget_issues:
        return RecoveryDecisionResult(
            action=RecoveryAction.STOP,
            reason=f"Policy G: stopping — {'; '.join(budget_issues)}",
            policy_id=policy_id,
            budget_remaining=budget.to_dict(),
        )

    # ── 5. Transient + fallback available ────────────────────────────────────
    if fault_category in TRANSIENT_CATEGORIES:
        tool_def = TOOL_REGISTRY.get(tool_name)
        fallback = tool_def.fallback_tool if tool_def else None
        if fallback and fallback in TOOL_REGISTRY:
            return RecoveryDecisionResult(
                action=RecoveryAction.FALLBACK,
                reason=(
                    f"Policy G: transient fault '{fault_category}' — "
                    f"using fallback '{fallback}' to avoid additional retry latency"
                ),
                policy_id=policy_id,
                budget_remaining=budget.to_dict(),
                fallback_tool=fallback,
                is_safe=True,
            )

        # ── 6. Transient + within budget → retry with backoff ────────────────
        backoff = _compute_backoff(retry_number)
        return RecoveryDecisionResult(
            action=RecoveryAction.RETRY,
            reason=(
                f"Policy G: transient fault '{fault_category}' — retrying "
                f"(attempt {retry_number + 1}/{budget.max_retries}) after {backoff:.1f}s backoff"
            ),
            policy_id=policy_id,
            budget_remaining=budget.to_dict(),
            backoff_seconds=backoff,
            is_safe=True,
        )

    # ── 7. Non-retryable → clarify ────────────────────────────────────────────
    if fault_category in NON_RETRYABLE_CATEGORIES:
        clarification = (
            f"Tool '{tool_name}' failed with a non-retryable error ({fault_category}). "
            f"Human input is needed to resolve: {tool_result.error_message or 'unknown error'}."
        )
        return RecoveryDecisionResult(
            action=RecoveryAction.CLARIFY,
            reason=f"Policy G: non-retryable fault '{fault_category}' — requesting clarification",
            policy_id=policy_id,
            budget_remaining=budget.to_dict(),
            clarification_request=clarification,
        )

    # ── 8. Unknown / safe stop ────────────────────────────────────────────────
    return RecoveryDecisionResult(
        action=RecoveryAction.SAFE_STOP,
        reason=f"Policy G: unclassified failure '{fault_category}' — safe stop",
        policy_id=policy_id,
        budget_remaining=budget.to_dict(),
        is_safe=True,
    )


# ─────────────────────────── Policy Registry ───────────────────────────────

RECOVERY_POLICIES = {
    "policy_a_baseline_stop": {
        "id": "policy_a_baseline_stop",
        "name": "Policy A: Baseline Stop",
        "description": "Stop execution immediately on any tool failure. Used as the baseline control condition.",
        "handler": policy_baseline_stop,
    },
    "policy_b_bounded_retry": {
        "id": "policy_b_bounded_retry",
        "name": "Policy B: Bounded Retry",
        "description": "Retry failed tool calls up to the configured maximum, with exponential backoff.",
        "handler": policy_bounded_retry,
    },
    "policy_c_validation_retry": {
        "id": "policy_c_validation_retry",
        "name": "Policy C: Validation and Retry",
        "description": "Validate tool output schema before accepting; retry on validation failure.",
        "handler": policy_validation_retry,
    },
    "policy_d_fallback": {
        "id": "policy_d_fallback",
        "name": "Policy D: Fallback",
        "description": "Use an alternative registered tool when the primary tool fails.",
        "handler": policy_fallback,
    },
    "policy_e_safe_stop": {
        "id": "policy_e_safe_stop",
        "name": "Policy E: Safe Stop",
        "description": "Stop when continuing could produce unsafe or invalid results.",
        "handler": policy_safe_stop,
    },
    "policy_f_clarification": {
        "id": "policy_f_clarification",
        "name": "Policy F: Clarification",
        "description": "Return a structured clarification request when the task cannot be safely completed.",
        "handler": policy_clarification,
    },
    "policy_g_budget_aware": {
        "id": "policy_g_budget_aware",
        "name": "Policy G: Budget-Aware Recovery (Proposed)",
        "description": (
            "Configurable recovery strategy considering failure category, retry budget, "
            "time budget, token/cost budget, output validation, fallback availability, "
            "and safety constraints. Decision rules are fully inspectable."
        ),
        "handler": policy_budget_aware,
    },
}


def get_policy_handler(policy_id: str):
    policy = RECOVERY_POLICIES.get(policy_id)
    if policy is None:
        raise ValueError(f"Unknown recovery policy: '{policy_id}'")
    return policy["handler"]
