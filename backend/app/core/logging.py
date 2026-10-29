"""
Structured logging setup for TrustTrace.
Redacts sensitive fields before emitting log records.
"""
import logging
import re
import sys
from app.core.config import settings

SENSITIVE_PATTERNS = [
    r"(api[_-]?key\s*[:=]\s*)[^\s,\"']+",
    r"(password\s*[:=]\s*)[^\s,\"']+",
    r"(secret\s*[:=]\s*)[^\s,\"']+",
    r"(token\s*[:=]\s*)[^\s,\"']+",
    r"(GOOGLE_API_KEY\s*[:=]\s*)[^\s,\"']+",
]


class RedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        for pattern in SENSITIVE_PATTERNS:
            msg = re.sub(pattern, r"\1[REDACTED]", msg, flags=re.IGNORECASE)
        record.msg = msg
        record.args = ()
        return True


def setup_logging() -> None:
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(RedactingFilter())
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%SZ",
    )
    handler.setFormatter(formatter)
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
