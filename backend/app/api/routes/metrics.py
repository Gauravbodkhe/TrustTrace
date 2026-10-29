"""Metrics and policy comparison routes."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db import get_db
from app.db import repository as repo
from app.models import Experiment, ExperimentRun
from app.schemas import PolicyComparisonResponse, PolicyComparisonRow
from app.services.metrics_engine import MetricsEngine
from app.services.recovery_engine import RECOVERY_POLICIES

router = APIRouter(prefix="/api/v1/metrics", tags=["metrics"])
metrics_engine = MetricsEngine()


@router.get("/dashboard")
def dashboard_stats(db: Session = Depends(get_db)):
    """Aggregate dashboard statistics from recorded runs."""
    stats = repo.get_dashboard_stats(db)
    recent = []
    for exp in stats.get("recent_experiments", []):
        recent.append({
            "id": exp.id,
            "name": exp.name,
            "status": exp.status,
            "policy_id": exp.policy_id,
            "scenario_id": exp.scenario_id,
            "created_at": exp.created_at.isoformat(),
        })
    stats["recent_experiments"] = recent
    return stats


@router.get("/comparison")
def compare_policies(
    experiment_ids: Optional[str] = Query(None, description="Comma-separated experiment IDs"),
    db: Session = Depends(get_db),
):
    """
    Compare recovery policy performance across experiments.
    Returns per-policy metrics. All values from recorded runs only.
    """
    if experiment_ids:
        ids = [e.strip() for e in experiment_ids.split(",")]
    else:
        all_exps = repo.list_experiments(db, limit=100)
        ids = [e.id for e in all_exps if e.status == "completed"]

    if not ids:
        return {"policies": [], "note": "No completed experiments found"}

    policy_data: dict = {}

    for exp_id in ids:
        experiment = repo.get_experiment(db, exp_id)
        if experiment is None:
            continue

        runs = repo.list_runs_for_experiment(db, exp_id)
        traces_by_run = {}
        for run in runs:
            traces_by_run[run.id] = repo.get_traces_for_run(db, run.id)

        policy_id = experiment.policy_id
        if policy_id not in policy_data:
            policy_data[policy_id] = {"runs": [], "traces_by_run": {}}
        policy_data[policy_id]["runs"].extend(runs)
        policy_data[policy_id]["traces_by_run"].update(traces_by_run)

    rows = []
    for policy_id, policy_info in RECOVERY_POLICIES.items():
        data = policy_data.get(policy_id, {"runs": [], "traces_by_run": {}})
        metrics = metrics_engine.compute(
            experiment_id="comparison",
            policy_id=policy_id,
            runs=data["runs"],
            traces_by_run=data["traces_by_run"],
        )
        rows.append({
            "policy_id": policy_id,
            "policy_name": policy_info.get("name", policy_id),
            "sample_size": metrics["sample_size"],
            "task_success_rate": metrics["task_success_rate"],
            "recovery_success_rate": metrics["recovery_success_rate"],
            "unsafe_recovery_rate": metrics["unsafe_recovery_rate"],
            "mean_latency_ms": metrics["mean_latency_ms"],
            "avg_retry_count": metrics["avg_retry_count"],
            "estimated_cost_usd": metrics["estimated_cost_usd"],
        })

    return {
        "policies": rows,
        "note": (
            "All metrics computed from recorded runs. "
            "estimated_cost_usd is null for simulated tools. "
            "Results are reproducible using stored seeds."
        ),
    }
