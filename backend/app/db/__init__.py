"""
Database engine and session factory.
Supports SQLite (local dev) and PostgreSQL (production via Supabase).
"""
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.models import Base
import logging

logger = logging.getLogger(__name__)

# Normalize sqlite URL
db_url = settings.DATABASE_URL.replace("sqlite+aiosqlite://", "sqlite://")

engine = create_engine(
    db_url,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in db_url else {},
)

SessionLocal = sessionmaker(
    bind=engine,
    class_=Session,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


def init_db() -> None:
    """Create all tables (development/test only — use migrations in production)."""
    Base.metadata.create_all(engine)
    logger.info("Database tables initialized")


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
