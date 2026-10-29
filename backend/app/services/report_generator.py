"""
Report Generator — creates CSV and JSON exports, and Markdown research reports.
"""
from __future__ import annotations
import csv
import json
import io
from datetime import datetime, timezone
from typing import Any, Dict, List

from app.models import Experiment, ExperimentRun, ExecutionTrace, MetricSummary


class ReportGenerator:

    def generate_csv(self, runs: List[ExperimentRun]) -> str:
        """Generate CSV export of run-level data."""
        output = io.StringIO()
        fieldnames = [
            "run_id", "experiment_id", "task_id", "run_number",
            "policy_id", "scenario_id", "seed", "status", "outcome",
            "started_at", "completed_at", "duration_ms",
            "retry_count", "token_usage", "estimated_cost_usd",
            "error_message",
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for run in runs:
            writer.writerow({
                "run_id": run.id,
                "experiment_id": run.experiment_id,
                "task_id": run.task_id,
                "run_number": run.run_number,
                "policy_id": run.policy_id,
                "scenario_id": run.scenario_id,
                "seed": run.seed,
                "status": run.status,
                "outcome": run.outcome,
                "started_at": run.started_at.isoformat() if run.started_at else "",
                "completed_at": run.completed_at.isoformat() if run.completed_at else "",
                "duration_ms": run.duration_ms,
                "retry_count": run.retry_count,
                "token_usage": run.token_usage,
                "estimated_cost_usd": run.estimated_cost_usd,
                "error_message": run.error_message or "",
            })
        return output.getvalue()

    def generate_json_export(
        self,
        experiment: Experiment,
        runs: List[ExperimentRun],
        traces_by_run: Dict[str, List[ExecutionTrace]],
        metrics: List[MetricSummary],
    ) -> Dict[str, Any]:
        """Generate structured JSON export of full experiment data."""
        return {
            "export_metadata": {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "format_version": "1.0",
                "note": "This export contains only recorded run data. No fabricated results.",
            },
            "experiment": {
                "id": experiment.id,
                "name": experiment.name,
                "description": experiment.description,
                "agent_type": experiment.agent_type,
                "policy_id": experiment.policy_id,
                "scenario_id": experiment.scenario_id,
                "task_ids": experiment.task_ids,
                "repetitions": experiment.repetitions,
                "seed": experiment.seed,
                "max_retries": experiment.max_retries,
                "timeout_seconds": experiment.timeout_seconds,
                "token_budget": experiment.token_budget,
                "cost_budget_usd": experiment.cost_budget_usd,
                "status": experiment.status,
                "created_at": experiment.created_at.isoformat(),
            },
            "runs": [
                {
                    "id": run.id,
                    "task_id": run.task_id,
                    "run_number": run.run_number,
                    "outcome": run.outcome,
                    "status": run.status,
                    "duration_ms": run.duration_ms,
                    "retry_count": run.retry_count,
                    "token_usage": run.token_usage,
                    "error_message": run.error_message,
                    "started_at": run.started_at.isoformat() if run.started_at else None,
                    "traces": [
                        {
                            "step_number": t.step_number,
                            "tool_name": t.tool_name,
                            "status": t.status,
                            "fault_injected": t.fault_injected,
                            "fault_category": t.fault_category,
                            "diagnosis_category": t.diagnosis_category,
                            "recovery_action": t.recovery_action,
                            "retry_number": t.retry_number,
                            "latency_ms": t.latency_ms,
                        }
                        for t in traces_by_run.get(run.id, [])
                    ],
                }
                for run in runs
            ],
            "metrics": [
                {
                    "policy_id": m.policy_id,
                    "task_success_rate": m.task_success_rate,
                    "recovery_success_rate": m.recovery_success_rate,
                    "diagnosis_accuracy": m.diagnosis_accuracy,
                    "unsafe_recovery_rate": m.unsafe_recovery_rate,
                    "mean_latency_ms": m.mean_latency_ms,
                    "median_latency_ms": m.median_latency_ms,
                    "p95_latency_ms": m.p95_latency_ms,
                    "avg_retry_count": m.avg_retry_count,
                    "total_token_usage": m.total_token_usage,
                    "estimated_cost_usd": m.estimated_cost_usd,
                    "sample_size": m.sample_size,
                    "calculated_at": m.calculated_at.isoformat(),
                }
                for m in metrics
            ],
        }

    def generate_markdown_report(
        self,
        experiment: Experiment,
        runs: List[ExperimentRun],
        metrics: List[MetricSummary],
    ) -> str:
        """Generate a downloadable Markdown research report."""
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        total = len(runs)
        successes = sum(1 for r in runs if r.outcome == "success")
        success_rate = f"{successes / total * 100:.1f}%" if total > 0 else "N/A"

        lines = [
            f"# TrustTrace Experiment Report",
            f"",
            f"**Generated:** {now}  ",
            f"**Experiment:** {experiment.name}  ",
            f"**Experiment ID:** `{experiment.id}`  ",
            f"",
            f"---",
            f"",
            f"## Experiment Configuration",
            f"",
            f"| Parameter | Value |",
            f"|-----------|-------|",
            f"| Agent Type | {experiment.agent_type} |",
            f"| Recovery Policy | {experiment.policy_id} |",
            f"| Fault Scenario | {experiment.scenario_id} |",
            f"| Tasks | {', '.join(experiment.task_ids)} |",
            f"| Repetitions | {experiment.repetitions} |",
            f"| Random Seed | {experiment.seed} |",
            f"| Max Retries | {experiment.max_retries} |",
            f"| Timeout | {experiment.timeout_seconds}s |",
            f"",
            f"## Evaluation Methodology",
            f"",
            f"All metrics are computed from recorded run data only. No results are fabricated.",
            f"",
            f"- **Task success rate**: fraction of runs where `outcome == 'success'`",
            f"- **Recovery success rate**: fraction of fault-affected runs that still succeeded",
            f"- **Diagnosis accuracy**: fraction of fault-injected steps correctly classified",
            f"- **Unsafe recovery rate**: fraction of runs with `outcome == 'unsafe'`",
            f"- **Latency**: wall-clock duration of each run",
            f"",
            f"> **Note:** estimated_cost_usd is null — simulated tools have no real API cost.",
            f"> P95 latency is null when sample size < 20.",
            f"",
            f"## Results Summary",
            f"",
            f"| Metric | Value |",
            f"|--------|-------|",
            f"| Total Runs | {total} |",
            f"| Successful Runs | {successes} |",
            f"| Task Success Rate | {success_rate} |",
        ]

        for m in metrics:
            lines += [
                f"",
                f"### Policy: {m.policy_id}",
                f"",
                f"| Metric | Value |",
                f"|--------|-------|",
                f"| Sample Size | {m.sample_size} |",
                f"| Task Success Rate | {m.task_success_rate if m.task_success_rate is not None else 'N/A'} |",
                f"| Recovery Success Rate | {m.recovery_success_rate if m.recovery_success_rate is not None else 'N/A'} |",
                f"| Diagnosis Accuracy | {m.diagnosis_accuracy if m.diagnosis_accuracy is not None else 'N/A'} |",
                f"| Unsafe Recovery Rate | {m.unsafe_recovery_rate if m.unsafe_recovery_rate is not None else 'N/A'} |",
                f"| Mean Latency | {m.mean_latency_ms}ms |",
                f"| Avg Retry Count | {m.avg_retry_count} |",
                f"| P95 Latency | {m.p95_latency_ms if m.p95_latency_ms is not None else 'N/A (n<20)'} |",
                f"| Estimated Cost | null (simulated tools) |",
            ]

        lines += [
            f"",
            f"## Limitations",
            f"",
            f"- All tool calls use simulated in-memory data — results may not generalize to real external tools.",
            f"- Sample sizes in single experiments are small; statistical significance is not claimed.",
            f"- P95 latency is only meaningful when ≥20 samples are available.",
            f"- Token usage is only recorded for steps that actually report it (not fabricated for others).",
            f"- This report reflects the specific fault scenario and task set configured for this experiment.",
            f"",
            f"---",
            f"*TrustTrace v0.1.0 — AI Agent Reliability Testing and Recovery Platform*",
        ]

        return "\n".join(lines)
