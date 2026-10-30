"""
TrustTrace SQLite -> Supabase PostgreSQL Data Migration Script.

Safely migrates all existing benchmark tasks, fault scenarios, sample test cases,
experiments, runs, traces, recovery decisions, and metric summaries from local
SQLite into persistent PostgreSQL (Supabase).

Usage:
    python backend/scripts/migrate_sqlite_to_postgres.py --sqlite trusttrace.db --postgres "postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"

Or using environment variable:
    set DATABASE_URL=postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres
    python backend/scripts/migrate_sqlite_to_postgres.py
"""
import sys
import os
import argparse
import logging
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker, Session

# Add backend directory to sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.models import (
    Base, Task, FaultScenario, SampleTestCase,
    Experiment, ExperimentRun, ExecutionTrace,
    RecoveryDecision, MetricSummary
)
from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migration")


def migrate(sqlite_path: str, postgres_url: str):
    logger.info("Starting safe migration...")
    logger.info("Source SQLite: %s", sqlite_path)
    # Mask password for logs
    masked_target = postgres_url.split("@")[-1] if "@" in postgres_url else postgres_url
    logger.info("Target PostgreSQL: ...@%s", masked_target)

    if not os.path.exists(sqlite_path):
        logger.error("SQLite file not found at: %s", sqlite_path)
        sys.exit(1)

    # Normalize URLs
    src_url = f"sqlite:///{os.path.abspath(sqlite_path)}"
    tgt_url = postgres_url.strip()
    if tgt_url.startswith("postgres://"):
        tgt_url = tgt_url.replace("postgres://", "postgresql://", 1)

    # Supabase SSL requirement
    connect_args = {}
    if "sslmode=" not in tgt_url and "localhost" not in tgt_url and "127.0.0.1" not in tgt_url:
        connect_args["sslmode"] = "require"

    src_engine = create_engine(src_url, connect_args={"check_same_thread": False})
    tgt_engine = create_engine(tgt_url, connect_args=connect_args, pool_pre_ping=True)

    # 1. Test connections
    try:
        with src_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Source SQLite connection verified.")
    except Exception as e:
        logger.error("Could not connect to source SQLite: %s", e)
        sys.exit(1)

    try:
        with tgt_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Target PostgreSQL connection verified.")
    except Exception as e:
        logger.error("Could not connect to target PostgreSQL: %s", e)
        sys.exit(1)

    # 2. Ensure schema exists on target (idempotent, never drops)
    logger.info("Ensuring target database tables exist...")
    Base.metadata.create_all(tgt_engine)

    SrcSession = sessionmaker(bind=src_engine)
    TgtSession = sessionmaker(bind=tgt_engine)

    # Tables to migrate in dependency order
    tables = [
        (Task, "tasks"),
        (FaultScenario, "fault_scenarios"),
        (SampleTestCase, "sample_test_cases"),
        (Experiment, "experiments"),
        (ExperimentRun, "experiment_runs"),
        (ExecutionTrace, "execution_traces"),
        (RecoveryDecision, "recovery_decisions"),
        (MetricSummary, "metric_summaries"),
    ]

    total_migrated = 0

    with SrcSession() as src_db, TgtSession() as tgt_db:
        for model_cls, name in tables:
            try:
                records = src_db.execute(select(model_cls)).scalars().all()
            except Exception as e:
                logger.warning("Could not read table '%s' from SQLite (may be empty or not yet created): %s", name, e)
                continue

            migrated_count = 0
            for record in records:
                target_existing = tgt_db.get(model_cls, record.id)
                if target_existing is None:
                    # Clone attributes
                    data = {
                        col.name: getattr(record, col.name)
                        for col in model_cls.__table__.columns
                    }
                    new_item = model_cls(**data)
                    tgt_db.add(new_item)
                    migrated_count += 1

            tgt_db.commit()
            total_migrated += migrated_count
            logger.info("Table '%s': %d records in SQLite, %d new records migrated to PostgreSQL.", name, len(records), migrated_count)

    logger.info("Migration finished successfully! Total %d records inserted into PostgreSQL.", total_migrated)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate TrustTrace SQLite database to PostgreSQL (Supabase)")
    parser.add_argument("--sqlite", default="trusttrace.db", help="Path to source SQLite database file")
    parser.add_argument("--postgres", default=os.environ.get("DATABASE_URL") or settings.DATABASE_URL, help="Target PostgreSQL connection URL")
    args = parser.parse_args()

    if not args.postgres or "sqlite" in args.postgres:
        logger.error("Please provide a valid target PostgreSQL URL via --postgres or DATABASE_URL environment variable.")
        sys.exit(1)

    migrate(args.sqlite, args.postgres)
