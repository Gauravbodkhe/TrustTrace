"""
Diagnosis Engine — classifies tool failures using explicit rule-based logic.

Ground truth is the known injected fault category.
Diagnosis uses observable trace evidence (error messages, output shape, timing).
Confidence is only reported when the evidence is unambiguous.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, Dict, Any
from app.services.fault_injector import FaultCategory
from app.tools.registry import ToolResult, ToolStatus


@dataclass
class DiagnosisResult:
    predicted_category: str
    ground_truth_category: Optional[str]   # Known only in controlled simulations
    evidence: list[str]
    confidence: Optional[float]           # None if not meaningfully calculable
    is_correct: Optional[bool]            # None if ground truth unknown
    explanation: str


class DiagnosisEngine:
    """
    Rule-based failure diagnosis engine.

    Classifies failures by inspecting:
    - Tool execution status (timeout, unavailable, failure, success)
    - Error message content (keyword matching)
    - Output shape (missing fields, wrong types, empty)
    - Execution timing (unusually high latency → timeout)
    """

    TIMEOUT_KEYWORDS = ["timed out", "timeout", "deadline exceeded", "connection timed"]
    UNAVAILABLE_KEYWORDS = ["unavailable", "outage", "service down", "unreachable", "503"]
    RATE_LIMIT_KEYWORDS = ["rate limit", "429", "too many requests", "throttled"]
    INVALID_ARGS_KEYWORDS = ["invalid argument", "invalid args", "bad request", "wrong type"]
    TRANSIENT_KEYWORDS = ["transient", "503", "temporary", "retry", "server error"]
    MALFORMED_KEYWORDS = ["malformed", "parse error", "json", "syntax error"]
    SCHEMA_KEYWORDS = ["schema validation", "schema", "wrong type", "type mismatch"]
    MISSING_FIELDS_KEYWORDS = ["missing required", "missing field", "required field"]
    AUTH_KEYWORDS = ["authentication failed", "unauthorized", "invalid or expired credentials", "401", "forbidden", "403"]
    NETWORK_KEYWORDS = ["network connection reset", "connection reset", "econnreset", "socket closed", "connection aborted", "network failure"]

    def diagnose(
        self,
        tool_result: ToolResult,
        ground_truth: Optional[str] = None,
        tool_name: str = "",
        step_number: int = 0,
    ) -> DiagnosisResult:
        evidence = []
        predicted = self._classify(tool_result, evidence)

        is_correct = None
        if ground_truth and ground_truth != FaultCategory.NONE.value:
            is_correct = predicted == ground_truth

        # Confidence: high if ground truth matches a deterministic signal
        confidence = self._estimate_confidence(predicted, tool_result, evidence)

        explanation = self._build_explanation(predicted, evidence, tool_name, step_number)

        return DiagnosisResult(
            predicted_category=predicted,
            ground_truth_category=ground_truth,
            evidence=evidence,
            confidence=confidence,
            is_correct=is_correct,
            explanation=explanation,
        )

    def _classify(self, result: ToolResult, evidence: list[str]) -> str:
        status = result.status
        error_msg = (result.error_message or "").lower()
        output = result.output or {}

        # ── Status-based primary signals ────────────────────────────────────
        if status == ToolStatus.TIMEOUT:
            evidence.append("execution_status=TIMEOUT")
            return FaultCategory.TIMEOUT.value

        if status == ToolStatus.UNAVAILABLE:
            evidence.append("execution_status=UNAVAILABLE")
            return FaultCategory.TOOL_UNAVAILABLE.value

        # ── Error message keyword matching ──────────────────────────────────
        if any(kw in error_msg for kw in self.TIMEOUT_KEYWORDS):
            evidence.append(f"error_message contains timeout keyword")
            return FaultCategory.TIMEOUT.value

        if any(kw in error_msg for kw in self.UNAVAILABLE_KEYWORDS):
            evidence.append("error_message contains unavailability keyword")
            return FaultCategory.TOOL_UNAVAILABLE.value

        if any(kw in error_msg for kw in self.RATE_LIMIT_KEYWORDS):
            evidence.append("error_message contains rate-limit keyword")
            return FaultCategory.RATE_LIMIT.value

        if any(kw in error_msg for kw in self.INVALID_ARGS_KEYWORDS):
            evidence.append("error_message contains invalid-arguments keyword")
            return FaultCategory.INVALID_ARGUMENTS.value

        if any(kw in error_msg for kw in self.TRANSIENT_KEYWORDS):
            evidence.append("error_message contains transient-error keyword")
            return FaultCategory.TRANSIENT_ERROR.value

        if any(kw in error_msg for kw in self.MALFORMED_KEYWORDS):
            evidence.append("error_message contains malformed-JSON keyword")
            return FaultCategory.MALFORMED_JSON.value

        if any(kw in error_msg for kw in self.SCHEMA_KEYWORDS):
            evidence.append("error_message contains schema-validation keyword")
            return FaultCategory.SCHEMA_VALIDATION.value

        if any(kw in error_msg for kw in self.MISSING_FIELDS_KEYWORDS):
            evidence.append("error_message contains missing-fields keyword")
            return FaultCategory.MISSING_FIELDS.value

        if any(kw in error_msg for kw in self.AUTH_KEYWORDS):
            evidence.append("error_message contains authentication-failure keyword")
            return FaultCategory.AUTH_FAILURE.value

        if any(kw in error_msg for kw in self.NETWORK_KEYWORDS):
            evidence.append("error_message contains network-failure keyword")
            return FaultCategory.NETWORK_FAILURE.value

        # ── Output shape analysis ────────────────────────────────────────────
        if status == ToolStatus.FAILURE:
            if output.get("_parse_error"):
                evidence.append("output has _parse_error flag")
                return FaultCategory.MALFORMED_JSON.value

            if not output:
                evidence.append("output is None or empty dict")
                return FaultCategory.EMPTY_RESPONSE.value

            if output == {}:
                evidence.append("output is empty dict {}")
                return FaultCategory.EMPTY_RESPONSE.value

            if set(output.keys()) == {"partial"}:
                evidence.append("output contains only 'partial' key — missing required fields")
                return FaultCategory.MISSING_FIELDS.value

            # Type mismatch in output fields
            for key, val in output.items():
                if isinstance(val, str) and key in ("count", "result", "total"):
                    evidence.append(f"output field '{key}' has wrong type (str instead of number)")
                    return FaultCategory.SCHEMA_VALIDATION.value

        # ── Success with suspicious content ─────────────────────────────────
        if status == ToolStatus.SUCCESS:
            if output.get("stale"):
                evidence.append("output.stale=True — data is outdated")
                return FaultCategory.STALE_DATA.value

        # ── Fallback ─────────────────────────────────────────────────────────
        evidence.append("no specific pattern matched — classified as unknown")
        return "unknown"

    def _estimate_confidence(
        self, predicted: str, result: ToolResult, evidence: list[str]
    ) -> Optional[float]:
        """
        Return a confidence value only when evidence is strong.
        Returns None when confidence cannot be meaningfully calculated.
        """
        if result.status == ToolStatus.TIMEOUT:
            return 0.95  # Status is authoritative
        if result.status == ToolStatus.UNAVAILABLE:
            return 0.95
        if result.status == ToolStatus.FAILURE and len(evidence) >= 2:
            return 0.80
        if len(evidence) == 1:
            return 0.60
        return None  # Cannot meaningfully quantify confidence

    def _build_explanation(
        self, category: str, evidence: list[str], tool_name: str, step: int
    ) -> str:
        base = f"Tool '{tool_name}' at step {step} was classified as '{category}'."
        if evidence:
            base += f" Evidence: {'; '.join(evidence)}."
        return base
