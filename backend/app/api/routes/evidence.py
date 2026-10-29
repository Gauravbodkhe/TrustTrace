"""
Evidence and Explainable Results routes.
Provides verifiable, transparent trace evidence packages for runs and experiments.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.db import repository as repo
from app.services.evidence_engine import EvidenceEngine

router = APIRouter(prefix="/api/v1/evidence", tags=["evidence"])
evidence_engine = EvidenceEngine()


@router.get("")
def list_evidence_summaries(
    experiment_id: Optional[str] = Query(None, description="Filter by experiment ID"),
    policy_id: Optional[str] = Query(None, description="Filter by recovery policy"),
    scenario_id: Optional[str] = Query(None, description="Filter by fault scenario"),
    outcome: Optional[str] = Query(None, description="Filter by outcome (success, failure, etc.)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List runs with high-level evidence status, fault observations, and verification flags."""
    runs = repo.list_all_runs(
        db,
        experiment_id=experiment_id,
        policy_id=policy_id,
        scenario_id=scenario_id,
        outcome=outcome,
        limit=limit,
        offset=offset,
    )

    summaries = []
    for r in runs:
        traces = repo.get_traces_for_run(db, r.id)
        fault_injected = any(t.fault_injected for t in traces)
        fault_category = next((t.fault_category for t in traces if t.fault_category), None)
        diagnosed_category = next((t.diagnosis_category for t in traces if t.diagnosis_category), None)
        recovery_action = next((t.recovery_action for t in traces if t.recovery_action), None)

        diagnosis_correct = None
        if fault_category and diagnosed_category:
            diagnosis_correct = (fault_category == diagnosed_category)

        summaries.append({
            "run_id": r.id,
            "experiment_id": r.experiment_id,
            "task_id": r.task_id,
            "run_number": r.run_number,
            "policy_id": r.policy_id,
            "scenario_id": r.scenario_id,
            "seed": r.seed,
            "outcome": r.outcome or r.status,
            "duration_ms": r.duration_ms,
            "retry_count": r.retry_count,
            "total_steps": len(traces),
            "fault_injected": fault_injected,
            "fault_category": fault_category,
            "diagnosed_category": diagnosed_category,
            "diagnosis_correct": diagnosis_correct,
            "recovery_action": recovery_action,
            "has_traces": len(traces) > 0,
            "started_at": r.started_at.isoformat() if r.started_at else None,
        })

    return {
        "total": len(summaries),
        "limit": limit,
        "offset": offset,
        "evidence_items": summaries,
    }


@router.get("/{run_id}")
def get_run_evidence(run_id: str, db: Session = Depends(get_db)):
    """Get the full, verifiable evidence package for a specific run."""
    run = repo.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")

    experiment = repo.get_experiment(db, run.experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail=f"Experiment '{run.experiment_id}' not found")

    traces = repo.get_traces_for_run(db, run_id)
    decisions = repo.get_decisions_for_run(db, run_id)

    return evidence_engine.build_run_evidence(
        experiment=experiment,
        run=run,
        traces=traces,
        decisions=decisions,
    )
