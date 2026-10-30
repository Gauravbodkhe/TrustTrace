"""Health check routes."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db import get_db, get_db_type
from app.core.config import settings
from app.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "ok"
        overall_status = "ok"
    except Exception as e:
        db_status = f"error: {type(e).__name__}"
        overall_status = "error"

    return HealthResponse(
        status=overall_status,
        version=settings.APP_VERSION,
        database=db_status,
        db_type=get_db_type(),
        gemini_available=settings.gemini_available,
        mock_mode=not settings.gemini_available,
        timestamp=datetime.now(timezone.utc),
    )
