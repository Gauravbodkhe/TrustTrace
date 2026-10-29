"""Execution trace routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.db import repository as repo
from app.schemas import TraceStepSchema, RecoveryDecisionSchema, RunSchema

router = APIRouter(prefix="/api/v1", tags=["traces"])


@router.get("/runs/{run_id}", response_model=RunSchema)
def get_run(run_id: str, db: Session = Depends(get_db)):
    run = repo.get_run(db, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")
    return run


@router.get("/runs/{run_id}/traces", response_model=List[TraceStepSchema])
def get_traces(run_id: str, db: Session = Depends(get_db)):
    run = repo.get_run(db, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")
    return repo.get_traces_for_run(db, run_id)


@router.get("/runs/{run_id}/decisions", response_model=List[RecoveryDecisionSchema])
def get_recovery_decisions(run_id: str, db: Session = Depends(get_db)):
    run = repo.get_run(db, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")
    return repo.get_recovery_decisions_for_run(db, run_id)
