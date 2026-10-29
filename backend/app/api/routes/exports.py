"""Export and report routes."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, PlainTextResponse
from sqlalchemy.orm import Session
import io
import json

from app.db import get_db
from app.db import repository as repo
from app.services.report_generator import ReportGenerator

router = APIRouter(prefix="/api/v1/exports", tags=["exports"])
report_gen = ReportGenerator()


@router.get("/{experiment_id}/csv")
def export_csv(experiment_id: str, db: Session = Depends(get_db)):
    """Export run-level data as CSV."""
    experiment = repo.get_experiment(db, experiment_id)
    if experiment is None:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found")

    runs = repo.list_runs_for_experiment(db, experiment_id)
    csv_content = report_gen.generate_csv(runs)

    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=trusttrace_{experiment_id}_runs.csv"},
    )


@router.get("/{experiment_id}/json")
def export_json(experiment_id: str, db: Session = Depends(get_db)):
    """Export full experiment data as JSON."""
    experiment = repo.get_experiment(db, experiment_id)
    if experiment is None:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found")

    runs = repo.list_runs_for_experiment(db, experiment_id)
    traces_by_run = {}
    for run in runs:
        traces_by_run[run.id] = repo.get_traces_for_run(db, run.id)

    metrics = repo.get_metric_summaries_for_experiment(db, experiment_id)
    export_data = report_gen.generate_json_export(experiment, runs, traces_by_run, metrics)

    return StreamingResponse(
        io.StringIO(json.dumps(export_data, indent=2, default=str)),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=trusttrace_{experiment_id}_export.json"},
    )


@router.get("/{experiment_id}/report")
def export_markdown_report(experiment_id: str, db: Session = Depends(get_db)):
    """Generate and download a Markdown research report."""
    experiment = repo.get_experiment(db, experiment_id)
    if experiment is None:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found")

    runs = repo.list_runs_for_experiment(db, experiment_id)
    metrics = repo.get_metric_summaries_for_experiment(db, experiment_id)
    report = report_gen.generate_markdown_report(experiment, runs, metrics)

    return PlainTextResponse(
        content=report,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=trusttrace_{experiment_id}_report.md"},
    )


@router.get("/tasks/list")
def list_tasks(db: Session = Depends(get_db)):
    """List all benchmark tasks."""
    tasks = repo.list_tasks(db, benchmark_only=False)
    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "category": t.category,
            "difficulty": t.difficulty,
            "is_benchmark": t.is_benchmark,
            "version": t.version,
        }
        for t in tasks
    ]
