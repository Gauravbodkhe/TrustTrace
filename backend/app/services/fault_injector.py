"""
Fault Injector — injects simulated failures into tool execution.

All failures are simulated within this controlled environment.
No external services are disrupted or contacted.
"""
from __future__ import annotations
import random
import time
from typing import Any, Dict, Optional
from dataclasses import dataclass
from enum import Enum

from app.tools.registry import ToolResult, ToolStatus


class FaultCategory(str, Enum):
    TIMEOUT = "timeout"
    TOOL_UNAVAILABLE = "tool_unavailable"
    MALFORMED_JSON = "malformed_json"
    MISSING_FIELDS = "missing_fields"
    INVALID_ARGUMENTS = "invalid_arguments"
    EMPTY_RESPONSE = "empty_response"
    STALE_DATA = "stale_data"
    TRANSIENT_ERROR = "transient_error"
    RATE_LIMIT = "rate_limit"
    SCHEMA_VALIDATION = "schema_validation"
    AUTH_FAILURE = "auth_failure"
    NETWORK_FAILURE = "network_failure"
    NONE = "none"


@dataclass
class InjectionConfig:
    scenario_id: str
    category: FaultCategory
    probability: float = 1.0
    deterministic_step: Optional[int] = None  # If set, inject at this exact step number
    failure_delay_ms: int = 0
    severity: str = "medium"
    seed: Optional[int] = None


@dataclass
class InjectionResult:
    injected: bool
    category: FaultCategory
    fault_result: Optional[ToolResult]
    delay_ms: int = 0
    reason: str = ""


# ─────────────────────────── Fault Generators ──────────────────────────────

def _make_timeout_fault(delay_ms: int) -> ToolResult:
    actual_delay = max(delay_ms, 100) / 1000.0
    time.sleep(actual_delay)
    return ToolResult(
        status=ToolStatus.TIMEOUT,
        output=None,
        error_message=f"Tool execution timed out after {actual_delay * 1000:.0f}ms",
        latency_ms=int(actual_delay * 1000),
    )


def _make_unavailable_fault() -> ToolResult:
    return ToolResult(
        status=ToolStatus.UNAVAILABLE,
        output=None,
        error_message="Tool is temporarily unavailable (simulated outage)",
        latency_ms=5,
    )


def _make_malformed_json_fault() -> ToolResult:
    # Return a result whose output cannot be parsed (represented as broken string in a special key)
    return ToolResult(
        status=ToolStatus.FAILURE,
        output={"_raw": "{ malformed json response }", "_parse_error": True},
        error_message="Response contained malformed JSON (simulated)",
        latency_ms=20,
    )


def _make_missing_fields_fault() -> ToolResult:
    # Output is present but key required fields are absent
    return ToolResult(
        status=ToolStatus.FAILURE,
        output={"partial": True},  # Missing all schema-expected fields
        error_message="Response is missing required output fields (simulated)",
        latency_ms=15,
    )


def _make_invalid_arguments_fault() -> ToolResult:
    return ToolResult(
        status=ToolStatus.FAILURE,
        output=None,
        error_message="Tool received invalid argument types or values (simulated)",
        latency_ms=5,
    )


def _make_empty_response_fault() -> ToolResult:
    return ToolResult(
        status=ToolStatus.FAILURE,
        output={},
        error_message="Tool returned an empty response (simulated)",
        latency_ms=10,
    )


def _make_stale_data_fault() -> ToolResult:
    return ToolResult(
        status=ToolStatus.SUCCESS,  # Tool succeeded but data is stale
        output={
            "results": [],
            "count": 0,
            "stale": True,
            "data_age_hours": 72,
            "warning": "Data may be outdated — last sync was 72 hours ago",
        },
        error_message=None,
        latency_ms=25,
    )


def _make_transient_error_fault() -> ToolResult:
    return ToolResult(
        status=ToolStatus.FAILURE,
        output=None,
        error_message="Transient internal server error (HTTP 503, simulated) — safe to retry",
        latency_ms=30,
    )


def _make_rate_limit_fault() -> ToolResult:
    return ToolResult(
        status=ToolStatus.FAILURE,
        output=None,
        error_message="Rate limit exceeded (HTTP 429, simulated) — retry after backoff",
        latency_ms=10,
    )


def _make_schema_validation_fault() -> ToolResult:
    return ToolResult(
        status=ToolStatus.FAILURE,
        output={"data": "unexpected_type", "count": "not_a_number"},  # Wrong types
        error_message="Response failed schema validation: field types do not match expected schema (simulated)",
        latency_ms=20,
    )


def _make_auth_failure_fault() -> ToolResult:
    return ToolResult(
        status=ToolStatus.FAILURE,
        output=None,
        error_message="Authentication failed: HTTP 401 Unauthorized — invalid or expired credentials (simulated)",
        latency_ms=10,
    )


def _make_network_failure_fault() -> ToolResult:
    return ToolResult(
        status=ToolStatus.FAILURE,
        output=None,
        error_message="Network connection reset by peer: ECONNRESET (simulated socket error) — safe to retry",
        latency_ms=35,
    )


_FAULT_GENERATORS = {
    FaultCategory.TIMEOUT: _make_timeout_fault,
    FaultCategory.TOOL_UNAVAILABLE: _make_unavailable_fault,
    FaultCategory.MALFORMED_JSON: _make_malformed_json_fault,
    FaultCategory.MISSING_FIELDS: _make_missing_fields_fault,
    FaultCategory.INVALID_ARGUMENTS: _make_invalid_arguments_fault,
    FaultCategory.EMPTY_RESPONSE: _make_empty_response_fault,
    FaultCategory.STALE_DATA: _make_stale_data_fault,
    FaultCategory.TRANSIENT_ERROR: _make_transient_error_fault,
    FaultCategory.RATE_LIMIT: _make_rate_limit_fault,
    FaultCategory.SCHEMA_VALIDATION: _make_schema_validation_fault,
    FaultCategory.AUTH_FAILURE: _make_auth_failure_fault,
    FaultCategory.NETWORK_FAILURE: _make_network_failure_fault,
}


# ─────────────────────────── Injector ──────────────────────────────────────

class FaultInjector:
    """
    Injects controlled, reproducible failures into tool execution.
    
    Supports:
    - Deterministic injection at a specific step number
    - Probabilistic injection with a seeded RNG
    - No actual external disruption — all faults are internal simulations
    """

    def __init__(self, config: InjectionConfig):
        self.config = config
        self._rng = random.Random(config.seed) if config.seed is not None else random.Random()

    def should_inject(self, step_number: int) -> bool:
        """Determine if a fault should be injected at this step."""
        if self.config.category == FaultCategory.NONE:
            return False

        if self.config.deterministic_step is not None:
            return step_number == self.config.deterministic_step

        return self._rng.random() < self.config.probability

    def inject(self, step_number: int, tool_name: str, tool_inputs: Dict[str, Any]) -> InjectionResult:
        """
        Attempt fault injection for this tool call.
        Returns InjectionResult indicating whether a fault was injected and what it was.
        """
        if not self.should_inject(step_number):
            return InjectionResult(
                injected=False,
                category=FaultCategory.NONE,
                fault_result=None,
                reason="Injection conditions not met",
            )

        category = self.config.category
        generator = _FAULT_GENERATORS.get(category)

        if generator is None:
            return InjectionResult(
                injected=False,
                category=FaultCategory.NONE,
                fault_result=None,
                reason=f"No generator for category '{category}'",
            )

        # Apply pre-injection delay if configured
        delay_ms = self.config.failure_delay_ms
        if delay_ms > 0:
            time.sleep(delay_ms / 1000.0)

        # Generate fault result
        if category == FaultCategory.TIMEOUT:
            fault_result = generator(delay_ms)
        else:
            fault_result = generator()

        return InjectionResult(
            injected=True,
            category=category,
            fault_result=fault_result,
            delay_ms=delay_ms,
            reason=f"Fault '{category}' injected at step {step_number} for tool '{tool_name}'",
        )


# ─────────────────────────── Built-in Scenarios ────────────────────────────

BUILTIN_SCENARIOS: Dict[str, Dict] = {
    "no_fault": {
        "id": "no_fault",
        "name": "No Fault (Baseline)",
        "description": "No faults are injected. Tools execute normally. Used as the control condition.",
        "category": "none",
        "probability": 0.0,
        "deterministic_step": None,
        "failure_delay_ms": 0,
        "severity": "none",
        "seed": None,
        "is_active": True,
    },
    "timeout_step1": {
        "id": "timeout_step1",
        "name": "Timeout at Step 1",
        "description": "The first tool call always times out. Deterministic injection for reproducible experiments.",
        "category": "timeout",
        "probability": 1.0,
        "deterministic_step": 1,
        "failure_delay_ms": 200,
        "severity": "high",
        "seed": 1001,
        "is_active": True,
    },
    "tool_unavailable_step2": {
        "id": "tool_unavailable_step2",
        "name": "Tool Unavailable at Step 2",
        "description": "The second tool call simulates a service outage.",
        "category": "tool_unavailable",
        "probability": 1.0,
        "deterministic_step": 2,
        "failure_delay_ms": 0,
        "severity": "high",
        "seed": 1002,
        "is_active": True,
    },
    "malformed_json_step1": {
        "id": "malformed_json_step1",
        "name": "Malformed JSON at Step 1",
        "description": "Step 1 returns a malformed JSON response that fails parsing.",
        "category": "malformed_json",
        "probability": 1.0,
        "deterministic_step": 1,
        "failure_delay_ms": 0,
        "severity": "medium",
        "seed": 1003,
        "is_active": True,
    },
    "missing_fields_step2": {
        "id": "missing_fields_step2",
        "name": "Missing Response Fields at Step 2",
        "description": "Step 2 response is missing required output fields.",
        "category": "missing_fields",
        "probability": 1.0,
        "deterministic_step": 2,
        "failure_delay_ms": 0,
        "severity": "medium",
        "seed": 1004,
        "is_active": True,
    },
    "invalid_args_step1": {
        "id": "invalid_args_step1",
        "name": "Invalid Arguments at Step 1",
        "description": "Step 1 reports that the arguments were invalid.",
        "category": "invalid_arguments",
        "probability": 1.0,
        "deterministic_step": 1,
        "failure_delay_ms": 0,
        "severity": "medium",
        "seed": 1005,
        "is_active": True,
    },
    "empty_response_step2": {
        "id": "empty_response_step2",
        "name": "Empty Response at Step 2",
        "description": "Step 2 returns an empty response body.",
        "category": "empty_response",
        "probability": 1.0,
        "deterministic_step": 2,
        "failure_delay_ms": 0,
        "severity": "low",
        "seed": 1006,
        "is_active": True,
    },
    "stale_data_step1": {
        "id": "stale_data_step1",
        "name": "Stale Data at Step 1",
        "description": "Step 1 returns outdated data (72 hours old). Task may still partially complete.",
        "category": "stale_data",
        "probability": 1.0,
        "deterministic_step": 1,
        "failure_delay_ms": 0,
        "severity": "low",
        "seed": 1007,
        "is_active": True,
    },
    "transient_error_step1": {
        "id": "transient_error_step1",
        "name": "Transient Error at Step 1",
        "description": "Step 1 returns a transient 503 error that may succeed on retry.",
        "category": "transient_error",
        "probability": 1.0,
        "deterministic_step": 1,
        "failure_delay_ms": 0,
        "severity": "medium",
        "seed": 1008,
        "is_active": True,
    },
    "rate_limit_step1": {
        "id": "rate_limit_step1",
        "name": "Rate Limit at Step 1",
        "description": "Step 1 receives a 429 rate-limit response. Backoff and retry appropriate.",
        "category": "rate_limit",
        "probability": 1.0,
        "deterministic_step": 1,
        "failure_delay_ms": 0,
        "severity": "medium",
        "seed": 1009,
        "is_active": True,
    },
    "schema_validation_step2": {
        "id": "schema_validation_step2",
        "name": "Schema Validation Failure at Step 2",
        "description": "Step 2 output fails schema validation — fields have wrong types.",
        "category": "schema_validation",
        "probability": 1.0,
        "deterministic_step": 2,
        "failure_delay_ms": 0,
        "severity": "medium",
        "seed": 1010,
        "is_active": True,
    },
    "probabilistic_transient_30pct": {
        "id": "probabilistic_transient_30pct",
        "name": "Probabilistic Transient Errors (30%)",
        "description": "Each tool call has a 30% chance of a transient error. Uses seed 2024 for reproducibility.",
        "category": "transient_error",
        "probability": 0.3,
        "deterministic_step": None,
        "failure_delay_ms": 0,
        "severity": "medium",
        "seed": 2024,
        "is_active": True,
    },
    "auth_failure_step1": {
        "id": "auth_failure_step1",
        "name": "Authentication Failure at Step 1",
        "description": "Step 1 encounters HTTP 401 Unauthorized or expired credentials. Expected recovery: Safe Stop.",
        "category": "auth_failure",
        "probability": 1.0,
        "deterministic_step": 1,
        "failure_delay_ms": 0,
        "severity": "critical",
        "seed": 1011,
        "is_active": True,
    },
    "network_failure_step1": {
        "id": "network_failure_step1",
        "name": "Network Connection Failure at Step 1",
        "description": "Step 1 encounters socket reset (ECONNRESET) or connection abort. Expected recovery: Bounded Retry.",
        "category": "network_failure",
        "probability": 1.0,
        "deterministic_step": 1,
        "failure_delay_ms": 0,
        "severity": "medium",
        "seed": 1012,
        "is_active": True,
    },
}
