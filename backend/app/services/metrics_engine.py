"""
Metrics Engine — calculates evaluation metrics from recorded run data.

All metric formulas are documented. Division-by-zero is handled explicitly.
Unavailable metrics are returned as None, not fabricated zeros.
"""
from __future__ import annotations
import statistics
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.models import ExperimentRun, ExecutionTrace


def _safe_rate(numerator: int, denominator: int) -> Optional[float]:
    """Return numerator/denominator, or None if denominator is 0."""
    if denominator == 0:
        return None
    return round(numerator / denominator, 4)


def _safe_percentile(values: List[float], pct: float) -> Optional[float]:
    """
    Return the pct-th percentile of values.
    Returns None if fewer than 20 samples (P95 not meaningful below that).
    """
    if not values:
        return None
    if pct == 95 and len(values) < 20:
        return None  # P95 not meaningful with small samples
    sorted_vals = sorted(values)
    idx = int(len(sorted_vals) * pct / 100)
    idx = min(idx, len(sorted_vals) - 1)
    return round(sorted_vals[idx], 2)


class MetricsEngine:
    """
    Computes evaluation metrics from a list of ExperimentRun records.

    Metric definitions:
    1. Task success rate = successful_runs / total_runs
       (success = outcome == 'success')
    2. Recovery success rate = runs_where_recovery_led_to_success / runs_with_failures
       (recovery was triggered when fault_injected=True in any trace step)
    3. Diagnosis accuracy = correctly_diagnosed_steps / total_fault_injected_steps
    4. Unsafe recovery rate = unsafe_outcome_runs / total_runs
    5. Mean latency = mean(run.duration_ms)
    6. Median latency = median(run.duration_ms)
    7. P95 latency = 95th percentile of duration_ms (only when sample_size >= 20)
    8. Avg retry count = mean(run.retry_count)
    9. Total token usage = sum(run.token_usage) — only actual reported values
    10. Estimated cost — only when valid pricing data available (currently null)
    """

    def compute(
        self,
        experiment_id: str,
        policy_id: str,
        runs: List[ExperimentRun],
        traces_by_run: Dict[str, List[ExecutionTrace]],
    ) -> Dict[str, Any]:
        if not runs:
            return self._empty_summary(experiment_id, policy_id)

        total = len(runs)
        successes = sum(1 for r in runs if r.outcome == "success")
        unsafe = sum(1 for r in runs if r.outcome == "unsafe")
        latencies = [r.duration_ms for r in runs if r.duration_ms is not None]
        retry_counts = [r.retry_count for r in runs]
        token_usages = [r.token_usage for r in runs if r.token_usage is not None]

        # Metric 1: Task success rate
        task_success_rate = _safe_rate(successes, total)

        # Metric 4: Unsafe recovery rate
        unsafe_recovery_rate = _safe_rate(unsafe, total)

        # Metric 5–7: Latency
        mean_latency = round(statistics.mean(latencies), 2) if latencies else None
        median_latency = round(statistics.median(latencies), 2) if latencies else None
        p95_latency = _safe_percentile(latencies, 95)

        # Metric 8: Average retry count
        avg_retry = round(statistics.mean(retry_counts), 3) if retry_counts else None

        # Metric 9: Total token usage (only real values)
        total_tokens = sum(token_usages) if token_usages else None

        # Metric 2: Recovery success rate
        # = runs that had at least one fault AND ended in success
        runs_with_faults = 0
        recovered_successes = 0
        for run in runs:
            run_traces = traces_by_run.get(run.id, [])
            had_fault = any(t.fault_injected for t in run_traces)
            if had_fault:
                runs_with_faults += 1
                if run.outcome == "success":
                    recovered_successes += 1
        recovery_success_rate = _safe_rate(recovered_successes, runs_with_faults)

        # Metric 3: Diagnosis accuracy
        # = trace steps where diagnosis matches known ground truth
        total_fault_steps = 0
        correct_diagnoses = 0
        for run_traces in traces_by_run.values():
            for trace in run_traces:
                if trace.fault_injected and trace.fault_category:
                    total_fault_steps += 1
                    if trace.diagnosis_category == trace.fault_category:
                        correct_diagnoses += 1
        diagnosis_accuracy = _safe_rate(correct_diagnoses, total_fault_steps)

        return {
            "experiment_id": experiment_id,
            "policy_id": policy_id,
            "task_success_rate": task_success_rate,
            "recovery_success_rate": recovery_success_rate,
            "diagnosis_accuracy": diagnosis_accuracy,
            "unsafe_recovery_rate": unsafe_recovery_rate,
            "mean_latency_ms": mean_latency,
            "median_latency_ms": median_latency,
            "p95_latency_ms": p95_latency,
            "avg_retry_count": avg_retry,
            "total_token_usage": total_tokens,
            "estimated_cost_usd": None,  # Not fabricated — only set with real pricing data
            "sample_size": total,
            "calculated_at": datetime.now(timezone.utc),
            "note": (
                "All metrics computed from recorded run data. "
                "estimated_cost_usd is null because no pricing data is available for simulated tools. "
                f"p95_latency_ms is null when sample_size < 20 (current: {total})."
            ),
        }

    def _empty_summary(self, experiment_id: str, policy_id: str) -> Dict[str, Any]:
        return {
            "experiment_id": experiment_id,
            "policy_id": policy_id,
            "task_success_rate": None,
            "recovery_success_rate": None,
            "diagnosis_accuracy": None,
            "unsafe_recovery_rate": None,
            "mean_latency_ms": None,
            "median_latency_ms": None,
            "p95_latency_ms": None,
            "avg_retry_count": None,
            "total_token_usage": None,
            "estimated_cost_usd": None,
            "sample_size": 0,
            "calculated_at": datetime.now(timezone.utc),
            "note": "No runs available for this policy/experiment combination.",
        }

    def compute_precision_recall_f1(
        self, true_categories: List[str], predicted_categories: List[str]
    ) -> Dict[str, Optional[float]]:
        """
        Compute per-category precision, recall, and F1 for diagnosis.
        Returns null values when a category has no samples.
        """
        if not true_categories or not predicted_categories:
            return {"precision": None, "recall": None, "f1": None, "note": "No samples"}

        categories = set(true_categories + predicted_categories)
        results = {}

        for cat in categories:
            tp = sum(1 for t, p in zip(true_categories, predicted_categories) if t == cat and p == cat)
            fp = sum(1 for t, p in zip(true_categories, predicted_categories) if t != cat and p == cat)
            fn = sum(1 for t, p in zip(true_categories, predicted_categories) if t == cat and p != cat)

            precision = _safe_rate(tp, tp + fp)
            recall = _safe_rate(tp, tp + fn)
            f1 = None
            if precision is not None and recall is not None and (precision + recall) > 0:
                f1 = round(2 * precision * recall / (precision + recall), 4)

            results[cat] = {"precision": precision, "recall": recall, "f1": f1, "support": tp + fn}

        return results
