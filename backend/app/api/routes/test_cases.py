"""Sample Test Cases API Routes."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.db import repository as repo
from app.schemas import (
    SampleTestCaseSchema, SampleTestCaseCreate, SampleTestCaseUpdate
)
from app.services.experiment_runner import ExperimentRunner

router = APIRouter(prefix="/api/v1/test-cases", tags=["test-cases"])


@router.get("", response_model=List[SampleTestCaseSchema])
def list_test_cases(
    sample_only: bool = Query(False, description="Filter only built-in sample cases"),
    db: Session = Depends(get_db),
):
    """List all available test cases (ordered by standard ID)."""
    return repo.list_sample_test_cases(db, sample_only=sample_only)


@router.get("/{case_id}", response_model=SampleTestCaseSchema)
def get_test_case(case_id: str, db: Session = Depends(get_db)):
    """Retrieve details of a specific test case."""
    tc = repo.get_sample_test_case(db, case_id)
    if tc is None:
        raise HTTPException(status_code=404, detail=f"Test case '{case_id}' not found")
    return tc


@router.post("", response_model=SampleTestCaseSchema, status_code=201)
def create_test_case(data: SampleTestCaseCreate, db: Session = Depends(get_db)):
    """Create a new custom test case or duplicate of a sample case."""
    tc = repo.create_sample_test_case(db, data)
    db.commit()
    return tc


@router.put("/{case_id}", response_model=SampleTestCaseSchema)
def update_test_case(case_id: str, updates: SampleTestCaseUpdate, db: Session = Depends(get_db)):
    """Edit or customize an existing test case."""
    tc = repo.update_sample_test_case(db, case_id, updates)
    if tc is None:
        raise HTTPException(status_code=404, detail=f"Test case '{case_id}' not found")
    db.commit()
    return tc


@router.post("/{case_id}/run")
def run_test_case(case_id: str, db: Session = Depends(get_db)):
    """
    Execute a sample test case.
    Creates a real experiment in the persistent database, runs it through ExperimentRunner,
    and records real traces, recovery decisions, and metric summaries.
    """
    tc = repo.get_sample_test_case(db, case_id)
    if tc is None:
        raise HTTPException(status_code=404, detail=f"Test case '{case_id}' not found")

    params = tc.default_params or {}
    exp_data = {
        "name": f"Sample Case: {tc.name} ({tc.id})",
        "description": f"Live execution of test case {tc.id} ({tc.name}). Expected recovery: {tc.expected_recovery}. {tc.description}",
        "agent_type": "mock",
        "policy_id": tc.recommended_policy_id,
        "scenario_id": tc.scenario_id,
        "task_ids": tc.task_ids,
        "repetitions": params.get("repetitions", 1),
        "seed": params.get("seed", 42),
        "max_retries": params.get("max_retries", 3),
        "timeout_seconds": params.get("timeout_seconds", 30),
        "token_budget": params.get("token_budget", 2000),
        "cost_budget_usd": params.get("cost_budget_usd", None),
    }

    experiment = repo.create_experiment(db, exp_data)
    db.commit()

    runner = ExperimentRunner(db)
    try:
        result = runner.run_experiment(experiment.id)
        db.commit()
        return {
            "status": "completed",
            "case_id": tc.id,
            "case_name": tc.name,
            "expected_recovery": tc.expected_recovery,
            "experiment_id": experiment.id,
            "result": result,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Execution of test case '{case_id}' failed: {e}")
