"""
Research Reports & PDF Export routes for TrustTrace.
Generates comprehensive overall reports, policy comparisons, and vector PDFs.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse, PlainTextResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
import io

from app.db import get_db
from app.db import repository as repo
from app.models import Experiment, ExperimentRun, ExecutionTrace
from app.services.report_generator import ReportGenerator
from app.services.recovery_engine import RECOVERY_POLICIES

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])
report_generator = ReportGenerator()


def _get_overall_data(
    db: Session,
    experiment_ids_str: Optional[str] = None,
    policy_id: Optional[str] = None,
    scenario_id: Optional[str] = None,
) -> dict:
    exp_id_list = [x.strip() for x in experiment_ids_str.split(",") if x.strip()] if experiment_ids_str else None

    # Fetch experiments
    if exp_id_list:
        experiments = [repo.get_experiment(db, eid) for eid in exp_id_list if repo.get_experiment(db, eid)]
    else:
        experiments = repo.list_experiments(db, limit=100)

    # Fetch runs
    runs = repo.list_all_runs(
        db,
        experiment_ids=[e.id for e in experiments] if experiments else None,
        policy_id=policy_id,
        scenario_id=scenario_id,
        limit=500,
    )

    # Compute policy comparison rows for all 7 policies
    policy_rows = []
    for p_id, p_info in RECOVERY_POLICIES.items():
        p_runs = [r for r in runs if r.policy_id == p_id]
        if p_runs:
            success_cnt = sum(1 for r in p_runs if r.outcome == "success")
            task_success_rate = round(success_cnt / len(p_runs), 4)

            # Faulted runs
            fault_runs_set = set(
                db.execute(
                    select(ExecutionTrace.run_id)
                    .where(ExecutionTrace.run_id.in_([r.id for r in p_runs]))
                    .where(ExecutionTrace.fault_injected == True)
                ).scalars().all()
            )
            if fault_runs_set:
                rec_cnt = sum(1 for r in p_runs if r.id in fault_runs_set and r.outcome == "success")
                rec_rate = round(rec_cnt / len(fault_runs_set), 4)
            else:
                rec_rate = None

            durations = [r.duration_ms for r in p_runs if r.duration_ms is not None]
            mean_lat = round(sum(durations) / len(durations), 1) if durations else None
            avg_retries = round(sum(r.retry_count for r in p_runs) / len(p_runs), 2)
            sample_size = len(p_runs)
        else:
            task_success_rate = None
            rec_rate = None
            mean_lat = None
            avg_retries = None
            sample_size = 0

        policy_rows.append({
            "policy_id": p_id,
            "policy_name": p_info["name"],
            "sample_size": sample_size,
            "task_success_rate": task_success_rate,
            "recovery_success_rate": rec_rate,
            "mean_latency_ms": mean_lat,
            "avg_retry_count": avg_retries,
        })

    failure_stats = repo.get_failure_distribution_stats(db)

    # Sample traces for appendix
    sample_traces = []
    if runs:
        recent_run_ids = [r.id for r in runs[:5]]
        sample_traces = db.execute(
            select(ExecutionTrace)
            .where(ExecutionTrace.run_id.in_(recent_run_ids))
            .order_by(ExecutionTrace.started_at.desc())
            .limit(20)
        ).scalars().all()

    scope_desc = f"Selected {len(experiments)} Experiments" if exp_id_list else "All Persisted Experiments"

    return report_generator.generate_overall_report_data(
        experiments=experiments,
        runs=runs,
        policy_comparison_rows=policy_rows,
        failure_stats=failure_stats,
        traces=sample_traces,
        scope_description=scope_desc,
    )


@router.get("/overall")
def get_overall_report(
    experiment_ids: Optional[str] = Query(None, description="Comma-separated experiment IDs"),
    policy_id: Optional[str] = Query(None, description="Filter by policy ID"),
    scenario_id: Optional[str] = Query(None, description="Filter by scenario ID"),
    db: Session = Depends(get_db),
):
    """Retrieve structured JSON of the overall multi-experiment research report."""
    return _get_overall_data(db, experiment_ids_str=experiment_ids, policy_id=policy_id, scenario_id=scenario_id)


@router.get("/overall/markdown")
def get_overall_markdown(
    experiment_ids: Optional[str] = Query(None, description="Comma-separated experiment IDs"),
    policy_id: Optional[str] = Query(None, description="Filter by policy ID"),
    scenario_id: Optional[str] = Query(None, description="Filter by scenario ID"),
    db: Session = Depends(get_db),
):
    """Download Markdown representation of the overall research report."""
    data = _get_overall_data(db, experiment_ids_str=experiment_ids, policy_id=policy_id, scenario_id=scenario_id)
    md_content = report_generator.generate_overall_markdown(data)

    return PlainTextResponse(
        content=md_content,
        media_type="text/markdown",
        headers={"Content-Disposition": "attachment; filename=trusttrace_overall_report.md"},
    )


@router.get("/overall/pdf")
def get_overall_pdf(
    experiment_ids: Optional[str] = Query(None, description="Comma-separated experiment IDs"),
    policy_id: Optional[str] = Query(None, description="Filter by policy ID"),
    scenario_id: Optional[str] = Query(None, description="Filter by scenario ID"),
    db: Session = Depends(get_db),
):
    """Generate and stream a vector PDF of the overall research report."""
    data = _get_overall_data(db, experiment_ids_str=experiment_ids, policy_id=policy_id, scenario_id=scenario_id)
    pdf_bytes = report_generator.generate_overall_pdf(data)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=trusttrace_overall_report.pdf"},
    )


@router.get("/{experiment_id}/pdf")
def get_experiment_pdf(experiment_id: str, db: Session = Depends(get_db)):
    """Generate and download a vector PDF for a specific experiment."""
    experiment = repo.get_experiment(db, experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found")

    runs = repo.list_runs_for_experiment(db, experiment_id)
    metrics = repo.get_metric_summaries_for_experiment(db, experiment_id)

    traces = []
    for r in runs:
        traces.extend(repo.get_traces_for_run(db, r.id))

    pdf_bytes = report_generator.generate_experiment_pdf(experiment, runs, metrics, traces)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=trusttrace_{experiment_id}_report.pdf"},
    )
