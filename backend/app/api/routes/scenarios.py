"""Fault Scenario routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.db import repository as repo
from app.schemas import ScenarioSchema, ScenarioCreate, ScenarioUpdate
from app.services.recovery_engine import RECOVERY_POLICIES

router = APIRouter(prefix="/api/v1/scenarios", tags=["scenarios"])


@router.get("", response_model=List[ScenarioSchema])
def list_scenarios(db: Session = Depends(get_db)):
    return repo.list_scenarios(db)


@router.get("/{scenario_id}", response_model=ScenarioSchema)
def get_scenario(scenario_id: str, db: Session = Depends(get_db)):
    scenario = repo.get_scenario(db, scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")
    return scenario


@router.post("", response_model=ScenarioSchema, status_code=201)
def create_scenario(data: ScenarioCreate, db: Session = Depends(get_db)):
    scenario = repo.create_scenario(db, data.model_dump())
    db.commit()
    return scenario


@router.put("/{scenario_id}", response_model=ScenarioSchema)
def update_scenario(scenario_id: str, data: ScenarioUpdate, db: Session = Depends(get_db)):
    scenario = repo.update_scenario(db, scenario_id, data.model_dump(exclude_none=True))
    if scenario is None:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")
    db.commit()
    return scenario


@router.get("/policies/list")
def list_policies():
    """List all available recovery policies."""
    return [
        {"id": k, "name": v["name"], "description": v["description"]}
        for k, v in RECOVERY_POLICIES.items()
    ]
