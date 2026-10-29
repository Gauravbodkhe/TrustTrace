"""Experiment routes — CRUD and run triggering."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.db import repository as repo
from app.schemas import ExperimentCreate, ExperimentSchema, ExperimentListItem, RunSchema
from app.services.experiment_runner import ExperimentRunner

router = APIRouter(prefix="/api/v1/experiments", tags=["experiments"])


@router.get("", response_model=List[ExperimentListItem])
def list_experiments(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    return repo.list_experiments(db, limit=limit, offset=offset)


@router.post("", response_model=ExperimentSchema, status_code=201)
def create_experiment(data: ExperimentCreate, db: Session = Depends(get_db)):
    scenario = repo.get_scenario(db, data.scenario_id)
    if scenario is None:
        raise HTTPException(status_code=422, detail=f"Scenario '{data.scenario_id}' not found")

    from app.services.recovery_engine import RECOVERY_POLICIES
    if data.policy_id not in RECOVERY_POLICIES:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown policy '{data.policy_id}'. Valid: {list(RECOVERY_POLICIES.keys())}",
        )

    for task_id in data.task_ids:
        task = repo.get_task(db, task_id)
        if task is None:
            raise HTTPException(status_code=422, detail=f"Task '{task_id}' not found")

    experiment = repo.create_experiment(db, data.model_dump())
    db.commit()
    return experiment


@router.get("/{experiment_id}", response_model=ExperimentSchema)
def get_experiment(experiment_id: str, db: Session = Depends(get_db)):
    experiment = repo.get_experiment(db, experiment_id)
    if experiment is None:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found")
    return experiment


@router.post("/{experiment_id}/run")
def run_experiment(
    experiment_id: str,
    db: Session = Depends(get_db),
):
    experiment = repo.get_experiment(db, experiment_id)
    if experiment is None:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found")

    if experiment.status == "running":
        raise HTTPException(status_code=409, detail="Experiment is already running")

    runner = ExperimentRunner(db)
    try:
        result = runner.run_experiment(experiment_id)
        db.commit()
        return result
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{experiment_id}/runs", response_model=List[RunSchema])
def list_runs(experiment_id: str, db: Session = Depends(get_db)):
    experiment = repo.get_experiment(db, experiment_id)
    if experiment is None:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found")
    return repo.list_runs_for_experiment(db, experiment_id)


@router.get("/{experiment_id}/metrics")
def get_experiment_metrics(experiment_id: str, db: Session = Depends(get_db)):
    experiment = repo.get_experiment(db, experiment_id)
    if experiment is None:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found")
    return repo.get_metric_summaries_for_experiment(db, experiment_id)
