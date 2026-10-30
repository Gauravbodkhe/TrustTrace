"""
Automated tests for database persistence, sample test cases, and idempotence.
"""
import pytest
from app.db import init_db, SessionLocal, get_db_type, test_connection as db_test_conn
from app.db import repository as repo
from app.models import Experiment, ExperimentRun, ExecutionTrace, SampleTestCase
from app.api.routes.test_cases import run_test_case


def test_database_connection_and_type():
    ok, msg = db_test_conn()
    assert ok is True
    assert msg == "ok"
    assert get_db_type() in ("sqlite", "postgresql")


def test_sample_test_cases_seeding_and_idempotence():
    init_db()
    with SessionLocal() as db:
        # Initial seeding
        repo.seed_benchmark_tasks(db)
        repo.seed_scenarios(db)
        repo.seed_sample_test_cases(db)
        db.commit()

        cases = repo.list_sample_test_cases(db)
        assert len(cases) == 10

        case_ids = [c.id for c in cases]
        for i in range(1, 11):
            assert f"TC-{i:03d}" in case_ids

        # Verify idempotence (re-seeding creates zero duplicates)
        new_tasks = repo.seed_benchmark_tasks(db)
        new_scenarios = repo.seed_scenarios(db)
        new_cases = repo.seed_sample_test_cases(db)
        db.commit()

        assert new_tasks == 0
        assert new_scenarios == 0
        assert new_cases == 0

        cases_after = repo.list_sample_test_cases(db)
        assert len(cases_after) == 10


def test_run_sample_case_persistence():
    with SessionLocal() as db:
        res = run_test_case("TC-001", db)
        assert res["status"] == "completed"
        assert res["case_id"] == "TC-001"
        exp_id = res["experiment_id"]

    # Verify records in a fresh session (simulating restart)
    with SessionLocal() as db2:
        exp = repo.get_experiment(db2, exp_id)
        assert exp is not None
        assert exp.status == "completed"
        assert exp.policy_id == "policy_b_bounded_retry"

        runs = repo.list_runs_for_experiment(db2, exp_id)
        assert len(runs) > 0

        traces = repo.get_traces_for_run(db2, runs[0].id)
        assert len(traces) > 0

        stats = repo.get_dashboard_stats(db2)
        assert stats["completed_experiments"] >= 1
        assert stats["total_sample_cases"] == 10


def test_all_10_sample_cases_executable():
    """Verify that all 10 standard sample test cases execute and record traces without errors."""
    with SessionLocal() as db:
        cases = repo.list_sample_test_cases(db)
        assert len(cases) == 10

        for case in cases:
            res = run_test_case(case.id, db)
            assert res["status"] == "completed"
            assert res["case_id"] == case.id
            exp_id = res["experiment_id"]

            exp = repo.get_experiment(db, exp_id)
            assert exp is not None
            assert exp.status == "completed"

