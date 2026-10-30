"""
TrustTrace Backend — FastAPI Application Entry Point
"""
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging
from app.db import init_db, SessionLocal, get_db_type
from app.db import repository as repo
from app.api.routes import health, experiments, scenarios, traces, metrics, exports, evidence, reports, test_cases


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    setup_logging()
    logger = logging.getLogger(__name__)
    logger.info("TrustTrace v%s starting in %s mode", settings.APP_VERSION, settings.APP_ENV)

    # Initialize database tables
    init_db()

    # Seed benchmark data & sample test cases
    with SessionLocal() as db:
        task_count = repo.seed_benchmark_tasks(db)
        scenario_count = repo.seed_scenarios(db)
        sample_tc_count = repo.seed_sample_test_cases(db)
        db.commit()
        logger.info(
            "Database ready: %d benchmark tasks, %d fault scenarios, %d sample test cases loaded",
            task_count, scenario_count, sample_tc_count
        )

    yield

    logger.info("TrustTrace shutting down")


app = FastAPI(
    title="TrustTrace API",
    description=(
        "AI Agent Reliability Testing and Recovery Platform. "
        "All experimental results are computed from actual recorded runs. "
        "No fabricated statistics."
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow configured frontend origin, localhost, and Vercel/cloud deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health.router)
app.include_router(experiments.router)
app.include_router(scenarios.router)
app.include_router(traces.router)
app.include_router(metrics.router)
app.include_router(exports.router)
app.include_router(evidence.router)
app.include_router(reports.router)
app.include_router(test_cases.router)


@app.get("/")
def root():
    return {
        "name": "TrustTrace",
        "version": settings.APP_VERSION,
        "description": "AI Agent Reliability Testing and Recovery Platform",
        "docs": "/docs",
        "health": "/health",
        "database_type": get_db_type(),
        "mock_mode": not settings.gemini_available,
    }
