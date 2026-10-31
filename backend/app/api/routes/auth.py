"""Authentication API Routes."""
import time
import json
import hmac
import hashlib
import base64
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.db import repository as repo
from app.core.config import settings
from app.schemas import UserLogin, UserRegister, UserResponse, TokenResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def create_access_token(user_id: str, email: str, role: str) -> str:
    """Create a tamper-proof HMAC-SHA256 signed access token (valid 7 days)."""
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": int(time.time()) + 86400 * 7,
    }
    data = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    signature = hmac.new(settings.SECRET_KEY.encode(), data.encode(), hashlib.sha256).hexdigest()
    return f"{data}.{signature}"


def decode_access_token(token: str) -> Optional[dict]:
    """Verify and decode token."""
    try:
        data, signature = token.strip().split(".")
        expected_sig = hmac.new(settings.SECRET_KEY.encode(), data.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        payload = json.loads(base64.urlsafe_b64decode(data.encode()).decode())
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[UserResponse]:
    """Extract user from Authorization: Bearer <token> if provided."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split("Bearer ")[1].strip()
    payload = decode_access_token(token)
    if not payload:
        return None
    user = repo.get_user_by_email(db, payload.get("email", ""))
    if not user or not user.is_active:
        return None
    return UserResponse.model_validate(user)


def get_current_user(
    current_user: Optional[UserResponse] = Depends(get_current_user_optional),
) -> UserResponse:
    """Enforce authenticated user."""
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user with email and password."""
    user = repo.get_user_by_email(db, credentials.email)
    if not user or not repo.verify_password(user.hashed_password, credentials.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token(user.id, user.email, user.role)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    """Register a new researcher account."""
    existing = repo.get_user_by_email(db, data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )
    user = repo.create_user(
        db,
        email=data.email,
        password=data.password,
        name=data.name or "Researcher",
        role="researcher",
    )
    db.commit()
    token = create_access_token(user.id, user.email, user.role)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/demo", response_model=TokenResponse)
def demo_login(db: Session = Depends(get_db)):
    """Fast one-click demo login for platform exploration."""
    user = repo.seed_default_user(db)
    db.commit()
    token = create_access_token(user.id, user.email, user.role)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: UserResponse = Depends(get_current_user)):
    """Return currently authenticated user profile."""
    return current_user


@router.post("/logout")
def logout():
    """Logout endpoint."""
    return {"status": "ok", "message": "Successfully logged out"}
