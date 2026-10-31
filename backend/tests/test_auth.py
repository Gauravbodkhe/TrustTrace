"""Tests for authentication and security."""
import time
from app.api.routes.auth import (
    create_access_token,
    decode_access_token,
    login,
    register,
    demo_login,
)
from app.schemas import UserLogin, UserRegister
from app.db import SessionLocal
from app.db import repository as repo


def test_password_hashing():
    stored = repo.hash_password("SuperSecure123!")
    assert stored and ":" in stored
    assert repo.verify_password(stored, "SuperSecure123!")
    assert not repo.verify_password(stored, "WrongPassword")


def test_jwt_token_creation_and_validation():
    token = create_access_token("user-123", "alice@example.com", "researcher")
    assert token and "." in token
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "user-123"
    assert payload["email"] == "alice@example.com"
    assert payload["role"] == "researcher"
    assert payload["exp"] > time.time()

    # Tampered token check
    tampered = token[:-2] + "xx"
    assert decode_access_token(tampered) is None


def test_auth_endpoints_directly():
    with SessionLocal() as db:
        # 1. Demo login
        demo_res = demo_login(db=db)
        assert demo_res.access_token
        assert demo_res.user.email == "researcher@trusttrace.ai"

        # 2. Register unique user
        import uuid
        unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
        reg_payload = UserRegister(email=unique_email, password="MyPassword123!", name="Test User")
        reg_res = register(reg_payload, db=db)
        assert reg_res.access_token
        assert reg_res.user.email == unique_email

        # 3. Login with credentials
        login_payload = UserLogin(email=unique_email, password="MyPassword123!")
        login_res = login(login_payload, db=db)
        assert login_res.access_token
        assert login_res.user.email == unique_email
