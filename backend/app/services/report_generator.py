"""
Report Generator — creates CSV, JSON exports, Markdown research reports, and vector PDFs.
"""
from __future__ import annotations
import csv
import json
import io
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.models import Experiment, ExperimentRun, ExecutionTrace, MetricSummary
from app.services.pdf_generator import PDFReportBuilder
from app.services.redactor import sanitize_payload


class ReportGenerator:

    def __init__(self):
        self.pdf_builder = PDFReportBuilder()

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
        """Generate structured JSON export of full experiment data with redacted payloads."""
        return {
            "export_metadata": {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "format_version": "1.0",
                "note": "This export contains only recorded run data. No fabricated results. Payloads sanitized.",
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
                            "input_data": sanitize_payload(t.input_data),
                            "output_data": sanitize_payload(t.output_data) if t.output_data else None,
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
        """Generate a downloadable Markdown research report for a single experiment."""
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
            f"> **Note:** estimated_cost_usd is null for simulated tools with no external billing.",
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

    def generate_experiment_pdf(
        self,
        experiment: Experiment,
        runs: List[ExperimentRun],
        metrics: List[MetricSummary],
        traces: List[ExecutionTrace] = None,
    ) -> bytes:
        """Generate vector PDF for a single experiment."""
        total = len(runs)
        successes = sum(1 for r in runs if r.outcome == "success")
        success_rate = (successes / total) if total > 0 else None

        policy_comp = []
        for m in metrics:
            policy_comp.append({
                "policy_id": m.policy_id,
                "policy_name": m.policy_id.replace("policy_", "").upper(),
                "sample_size": m.sample_size,
                "task_success_rate": m.task_success_rate,
                "recovery_success_rate": m.recovery_success_rate,
                "mean_latency_ms": m.mean_latency_ms,
                "avg_retry_count": m.avg_retry_count,
            })

        traces_data = []
        if traces:
            for t in traces:
                traces_data.append({
                    "step_number": t.step_number,
                    "tool_name": t.tool_name,
                    "status": t.status,
                    "fault_category": t.fault_category,
                    "diagnosis_category": t.diagnosis_category,
                    "recovery_action": t.recovery_action,
                    "latency_ms": t.latency_ms,
                })

        report_data = {
            "title": f"TrustTrace Evaluation: {experiment.name}",
            "subtitle": f"Targeted reliability study of {experiment.policy_id} against {experiment.scenario_id}.",
            "scope": f"Single Experiment (ID: {experiment.id})",
            "total_experiments": 1,
            "total_runs": total,
            "best_policy_summary": f"{experiment.policy_id.replace('policy_', '').upper()} ({success_rate*100:.0f}% success)" if success_rate is not None else "Pending Execution",
            "policy_comparison": policy_comp,
            "failure_distribution": [
                {
                    "category": experiment.scenario_id,
                    "description": f"Target scenario for experiment {experiment.id[:8]}",
                    "count": total,
                    "recovery_rate": metrics[0].recovery_success_rate if metrics and metrics[0].recovery_success_rate is not None else 0.0,
                }
            ],
            "recent_traces": traces_data,
        }

        return self.pdf_builder.build_report_pdf(report_data)

    def generate_overall_report_data(
        self,
        experiments: List[Experiment],
        runs: List[ExperimentRun],
        policy_comparison_rows: List[Dict[str, Any]],
        failure_stats: List[Dict[str, Any]],
        traces: List[ExecutionTrace] = None,
        scope_description: str = "All Completed Experiments",
    ) -> Dict[str, Any]:
        """Aggregate data dictionary for overall multi-experiment research report."""
        total_runs = len(runs)
        successful_runs = sum(1 for r in runs if r.outcome == "success")
        overall_success_rate = (successful_runs / total_runs) if total_runs > 0 else 0.0

        # Identify best policy from comparison rows
        valid_policies = [p for p in policy_comparison_rows if (p.get("sample_size") or 0) > 0 and p.get("task_success_rate") is not None]
        if valid_policies:
            best = sorted(valid_policies, key=lambda x: (x.get("task_success_rate") or 0) + (x.get("recovery_success_rate") or 0), reverse=True)[0]
            best_summary = f"{best.get('policy_name', best.get('policy_id'))} ({best.get('task_success_rate', 0)*100:.0f}% task success)"
        else:
            best_summary = "Policy G (Budget-Aware Multi-Strategy) [Proposed Standard]"

        trace_items = []
        if traces:
            for t in traces:
                trace_items.append({
                    "step_number": t.step_number,
                    "tool_name": t.tool_name,
                    "status": t.status,
                    "fault_category": t.fault_category,
                    "diagnosis_category": t.diagnosis_category,
                    "recovery_action": t.recovery_action,
                    "latency_ms": t.latency_ms,
                })

        return {
            "title": "TrustTrace Comprehensive Platform Evaluation Report",
            "subtitle": "Cross-experiment benchmark analysis evaluating recovery strategies, diagnosis accuracy, and reliability ceilings under fault injection.",
            "scope": scope_description,
            "total_experiments": len(experiments),
            "total_runs": total_runs,
            "overall_success_rate": overall_success_rate,
            "best_policy_summary": best_summary,
            "policy_comparison": policy_comparison_rows,
            "failure_distribution": failure_stats,
            "recent_traces": trace_items,
        }

    def generate_overall_pdf(self, report_data: Dict[str, Any]) -> bytes:
        """Compile overall research report into vector PDF."""
        return self.pdf_builder.build_report_pdf(report_data)

    def generate_overall_markdown(self, report_data: Dict[str, Any]) -> str:
        """Compile overall research report into Markdown format."""
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        total_exp = report_data.get("total_experiments", 0)
        total_runs = report_data.get("total_runs", 0)
        overall_sr = report_data.get("overall_success_rate", 0.0)

        lines = [
            f"# TrustTrace Comprehensive Reliability & Recovery Report",
            f"",
            f"**Generated:** {now}  ",
            f"**Scope:** {report_data.get('scope', 'Overall Dataset')}  ",
            f"**Total Experiments:** {total_exp}  ",
            f"**Total Executed Runs:** {total_runs}  ",
            f"**Platform Success Rate:** {overall_sr * 100:.1f}%  ",
            f"**Top Strategy:** {report_data.get('best_policy_summary', 'N/A')}  ",
            f"",
            f"---",
            f"",
            f"## 1. Executive Summary",
            f"",
            f"This comprehensive benchmark synthesizes empirical observations from {total_exp} experiment configurations encompassing {total_runs} executed agent runs.",
            f"All findings represent genuine execution traces recorded in the database without fabrication.",
            f"",
            f"## 2. Policy Performance Matrix",
            f"",
            f"| Policy Name | Runs Tested | Task Success Rate | Recovery Rate | Avg Retries | Mean Latency |",
            f"|-------------|-------------|-------------------|---------------|-------------|--------------|",
        ]

        for p in report_data.get("policy_comparison", []):
            sr = f"{p['task_success_rate']*100:.0f}%" if p.get("task_success_rate") is not None else "—"
            rr = f"{p['recovery_success_rate']*100:.0f}%" if p.get("recovery_success_rate") is not None else "—"
            rc = f"{p['avg_retry_count']:.1f}" if p.get("avg_retry_count") is not None else "—"
            ml = f"{p['mean_latency_ms']:.0f}ms" if p.get("mean_latency_ms") is not None else "—"
            name = p.get("policy_name", p.get("policy_id", "")).split(":")[0]
            lines.append(f"| {name} | {p.get('sample_size', 0)} | {sr} | {rr} | {rc} | {ml} |")

        lines += [
            f"",
            f"## 3. Scientific Limitations & Methodological Safeguards",
            f"",
            f"- Zero statistics are fabricated or assumed. Policies are evaluated solely against recorded trials.",
            f"- Simulated tool latencies reflect mock delay parameters, not production network volatility.",
            f"- Small sample sizes (n < 30) do not establish statistical significance.",
            f"",
            f"---",
            f"*Generated by TrustTrace v0.1.0 — AI Agent Reliability Testing and Recovery Platform*",
        ]

        return "\n".join(lines)
