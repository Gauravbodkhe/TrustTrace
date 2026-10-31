"""
Database engine and session factory.
Supports SQLite (local dev) and PostgreSQL (production via Supabase).
"""
import os
import logging
from sqlalchemy import create_engine, select, text, event
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.models import Base

logger = logging.getLogger(__name__)

# Normalize sqlite URL or postgres URL
raw_url = (settings.DATABASE_URL or "sqlite:///./trusttrace.db").strip()

if raw_url.startswith("sqlite+aiosqlite://"):
    db_url = raw_url.replace("sqlite+aiosqlite://", "sqlite://")
elif raw_url.startswith("postgres://"):
    db_url = raw_url.replace("postgres://", "postgresql://", 1)
else:
    db_url = raw_url

is_postgres = "postgresql" in db_url

connect_args = {}
engine_kwargs = {
    "echo": False,
}

if is_postgres:
    # Ensure sslmode=require for Supabase / Cloud Postgres if not explicitly specified
    if "sslmode=" not in db_url and "localhost" not in db_url and "127.0.0.1" not in db_url:
        connect_args["sslmode"] = "require"
    engine_kwargs.update({
        "connect_args": connect_args,
        "pool_pre_ping": True,
        "pool_size": 5,
        "max_overflow": 10,
        "pool_recycle": 300,
    })
else:
    # SQLite
    connect_args.update({"check_same_thread": False, "timeout": 15})
    engine_kwargs["connect_args"] = connect_args

engine = create_engine(db_url, **engine_kwargs)

if not is_postgres:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA busy_timeout=10000")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(
    bind=engine,
    class_=Session,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


def get_db_type() -> str:
    """Return 'postgresql' or 'sqlite'."""
    return "postgresql" if is_postgres else "sqlite"


def test_connection() -> tuple[bool, str]:
    """Test database connection with a lightweight SELECT 1 query."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, "ok"
    except Exception as e:
        logger.error("Database connection check failed: %s", e)
        return False, str(e)


def init_db() -> None:
    """
    Create all tables idempotently (never drops or recreates existing tables).
    Preserves all existing experiments, traces, runs, and sample cases.
    """
    from sqlalchemy import inspect

    if not is_postgres:
        with engine.connect() as conn:
            conn.execute(text("PRAGMA journal_mode=WAL"))
            conn.commit()

    Base.metadata.create_all(engine)

    # Ensure schema backward compatibility (add newly introduced columns if missing)
    try:
        with engine.connect() as conn:
            inspector = inspect(conn)
            table_names = inspector.get_table_names()
            if "experiments" in table_names:
                exp_cols = [c["name"] for c in inspector.get_columns("experiments")]
                if "hypothesis" not in exp_cols:
                    conn.execute(text("ALTER TABLE experiments ADD COLUMN hypothesis TEXT DEFAULT ''"))
                    conn.commit()
                    logger.info("Migrated experiments table: added hypothesis column")
    except Exception as e:
        logger.warning("Schema compatibility check: %s", e)

    logger.info("Database tables initialized on %s (permanent persistence ready)", get_db_type().upper())


def get_db():
    """FastAPI dependency for database sessions."""
    with SessionLocal() as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
