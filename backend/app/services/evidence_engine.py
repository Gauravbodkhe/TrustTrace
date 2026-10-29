"""
Evidence and Explainable Results Engine for TrustTrace.
Constructs verifiable, evidence-backed evaluation packages for each run,
clearly distinguishing between Observed Evidence, Calculated Metrics,
Rule-Based Diagnosis, and AI-Generated Explanations.
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.models import Experiment, ExperimentRun, ExecutionTrace, RecoveryDecision
from app.services.redactor import sanitize_payload, redact_string


class EvidenceEngine:

    def build_run_evidence(
        self,
        experiment: Experiment,
        run: ExperimentRun,
        traces: List[ExecutionTrace],
        decisions: List[RecoveryDecision],
    ) -> Dict[str, Any]:
        """
        Construct a complete, transparent evidence package for a single run.
        Ensures strict separation between observed facts, calculated numbers,
        rule-based diagnosis, and AI interpretation.
        """
        sorted_traces = sorted(traces, key=lambda t: (t.step_number, t.retry_number))

        # 1. Observed Evidence (Raw measurements, sanitized inputs/outputs, HTTP/tool signals)
        observed_evidence = []
        fault_injected_steps = []
        ground_truth_categories = []
        diagnosed_categories = []

        for trace in sorted_traces:
            sanitized_input = sanitize_payload(trace.input_data)
            sanitized_output = sanitize_payload(trace.output_data) if trace.output_data else None

            step_evidence = {
                "step_number": trace.step_number,
                "retry_number": trace.retry_number,
                "trace_id": trace.id,
                "tool_name": trace.tool_name,
                "started_at": trace.started_at.isoformat() if trace.started_at else None,
                "ended_at": trace.ended_at.isoformat() if trace.ended_at else None,
                "latency_ms": trace.latency_ms,
                "token_usage": trace.token_usage,
                "status": trace.status,
                "fault_injected": trace.fault_injected,
                "fault_category": trace.fault_category,
                "diagnosis_category": trace.diagnosis_category,
                "recovery_action": trace.recovery_action,
                "sanitized_inputs": sanitized_input,
                "sanitized_outputs": sanitized_output,
            }
            observed_evidence.append(step_evidence)

            if trace.fault_injected:
                fault_injected_steps.append(trace.step_number)
                if trace.fault_category:
                    ground_truth_categories.append(trace.fault_category)
            if trace.diagnosis_category:
                diagnosed_categories.append(trace.diagnosis_category)

        # 2. Calculated Metrics (Directly computable mathematical formulas)
        total_steps = len(sorted_traces)
        retries_used = run.retry_count
        max_retries = experiment.max_retries or 3
        retry_budget_pct = round((retries_used / max_retries * 100), 1) if max_retries > 0 else 0.0

        token_budget_pct = None
        if experiment.token_budget and run.token_usage:
            token_budget_pct = round((run.token_usage / experiment.token_budget * 100), 1)

        calculated_metrics = {
            "total_execution_steps": total_steps,
            "wall_clock_duration_ms": run.duration_ms,
            "retries_used": retries_used,
            "max_retries_configured": max_retries,
            "retry_budget_consumed_pct": retry_budget_pct,
            "token_usage": run.token_usage,
            "token_budget_configured": experiment.token_budget,
            "token_budget_consumed_pct": token_budget_pct,
            "actual_cost_usd": run.estimated_cost_usd,
            "terminal_outcome": run.outcome or run.status,
        }

        # 3. Rule-Based Diagnosis & Decisions
        decisions_list = []
        for d in decisions:
            decisions_list.append({
                "decision_id": d.id,
                "trace_id": d.trace_id,
                "policy_id": d.policy_id,
                "action": d.decision,
                "reason": redact_string(d.reason),
                "budget_remaining": d.budget_remaining,
                "timestamp": d.created_at.isoformat() if d.created_at else None,
            })

        diagnosis_accuracy_match = None
        if ground_truth_categories and diagnosed_categories:
            diagnosis_accuracy_match = (ground_truth_categories[0] == diagnosed_categories[0])
        elif not ground_truth_categories:
            diagnosis_accuracy_match = None  # Baseline no fault

        rule_based_diagnosis = {
            "ground_truth_fault": ground_truth_categories[0] if ground_truth_categories else "none",
            "diagnosed_fault": diagnosed_categories[0] if diagnosed_categories else "none",
            "diagnosis_correct": diagnosis_accuracy_match,
            "recovery_decisions": decisions_list,
        }

        # 4. AI-Generated Interpretative Explanation (Citing specific trace evidence)
        citations = []
        for s in observed_evidence:
            if s["fault_injected"]:
                citations.append(f"Step #{s['step_number']} ({s['tool_name']}): Fault '{s['fault_category']}' observed (Trace: {s['trace_id'][:8]})")
            if s["recovery_action"]:
                citations.append(f"Step #{s['step_number']} ({s['tool_name']}): Recovery action '{s['recovery_action']}' taken")

        explanation_text = self._generate_structured_explanation(
            experiment=experiment,
            run=run,
            traces=sorted_traces,
            ground_truth=rule_based_diagnosis["ground_truth_fault"],
            diagnosed=rule_based_diagnosis["diagnosed_fault"],
            decisions=decisions_list,
        )

        ai_explanation = {
            "summary": explanation_text["summary"],
            "root_cause_analysis": explanation_text["root_cause"],
            "recovery_assessment": explanation_text["recovery"],
            "recommended_next_step": explanation_text["next_step"],
            "supporting_evidence_citations": citations,
            "disclaimer": "AI explanations are interpretative hypotheses based on telemetry and must not be treated as empirical proof without verifying the cited trace steps.",
        }

        # 5. Missing Evidence Checklist
        missing_evidence = []
        if run.token_usage is None:
            missing_evidence.append({
                "field": "token_usage",
                "reason": "Token usage telemetry was not reported by this tool/agent provider.",
            })
        if run.estimated_cost_usd is None:
            missing_evidence.append({
                "field": "estimated_cost_usd",
                "reason": "Simulated in-memory execution produces zero external API billing cost (reported as null, not fabricated).",
            })
        if not ground_truth_categories and experiment.scenario_id != "no_fault":
            missing_evidence.append({
                "field": "ground_truth_fault",
                "reason": "No fault injection event was recorded in any step of this run.",
            })

        return {
            "run_id": run.id,
            "experiment_id": experiment.id,
            "experiment_name": experiment.name,
            "task_id": run.task_id,
            "policy_id": run.policy_id,
            "scenario_id": run.scenario_id,
            "seed": run.seed,
            "agent_type": experiment.agent_type,
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
            "observed_evidence": observed_evidence,
            "calculated_metrics": calculated_metrics,
            "rule_based_diagnosis": rule_based_diagnosis,
            "ai_explanation": ai_explanation,
            "missing_evidence": missing_evidence,
            "integrity_status": "VERIFIED_BY_TRACES" if len(observed_evidence) > 0 else "NO_TRACES_RECORDED",
        }

    def _generate_structured_explanation(
        self,
        experiment: Experiment,
        run: ExperimentRun,
        traces: List[ExecutionTrace],
        ground_truth: str,
        diagnosed: str,
        decisions: List[Dict[str, Any]],
    ) -> Dict[str, str]:
        """Generate structured text explanation grounded in trace facts."""
        policy_label = run.policy_id.replace("policy_", "").upper()
        scenario_label = run.scenario_id.replace("_", " ")

        if run.outcome == "success":
            summary = f"The agent successfully completed task '{run.task_id}' using strategy {policy_label}."
            if ground_truth != "none":
                summary += f" An injected '{ground_truth}' fault was detected and overcome."
        else:
            summary = f"The agent failed to complete task '{run.task_id}'. Run terminated with outcome '{run.outcome or run.status}'."

        # Root cause
        if ground_truth == "none":
            root_cause = "No fault was injected during this run (baseline nominal condition)."
        else:
            root_cause = f"At execution time, simulated fault condition '{scenario_label}' was triggered."
            if diagnosed != "none":
                root_cause += f" The rule-based diagnosis engine classified it as '{diagnosed}'."

        # Recovery assessment
        if not decisions:
            recovery = f"No recovery actions were dispatched under policy {policy_label}."
        else:
            action_names = [d["action"] for d in decisions]
            recovery = f"Policy {policy_label} dispatched {len(decisions)} action(s): {', '.join(action_names)}."
            if run.outcome == "success":
                recovery += " The actions enabled the agent to continue and finish the task."
            else:
                recovery += f" The actions did not resolve the error within the retry ceiling of {run.retry_count} retries."

        # Next step
        if run.policy_id.startswith("policy_a"):
            next_step = "Evaluate the same task and fault scenario using Policy C (Exponential Backoff) or Policy G (Budget-Aware Multi-Strategy) to observe automated recovery."
        elif run.policy_id.startswith("policy_g"):
            next_step = "Compare token consumption between deterministic mock simulation and Gemini Flash LLM to measure cost overhead."
        else:
            next_step = "Inspect the Trace Explorer timeline for step-by-step latency profiling and error responses."

        return {
            "summary": summary,
            "root_cause": root_cause,
            "recovery": recovery,
            "next_step": next_step,
        }
