"""
Data and Secret Redaction Utility for TrustTrace.
Ensures tool inputs, outputs, error messages, and trace telemetry
do not leak passwords, API keys, bearer tokens, or sensitive personal data.
"""
from __future__ import annotations
import re
from typing import Any, Dict, List, Union

# Common sensitive key patterns (case-insensitive)
SENSITIVE_KEY_PATTERNS = re.compile(
    r"(password|secret|token|api_?key|auth|bearer|credential|private_?key|ssn|card_?number)",
    re.IGNORECASE,
)

# Regex patterns for sensitive value patterns in text
PATTERNS = [
    # Bearer tokens
    (re.compile(r"Bearer\s+[A-Za-z0-9_\-\.]{10,}", re.IGNORECASE), "Bearer [REDACTED_TOKEN]"),
    # OpenAI style keys: sk-....
    (re.compile(r"sk-[A-Za-z0-9_\-]{20,}"), "[REDACTED_OPENAI_KEY]"),
    # Google API style keys: AIzaSy...
    (re.compile(r"AIzaSy[A-Za-z0-9_\-]{33}"), "[REDACTED_GOOGLE_KEY]"),
    # Generic API key query params or strings: ?api_key=... or key=...
    (re.compile(r"(api_?key|secret|password|token)=([A-Za-z0-9_\-\.%]{6,})", re.IGNORECASE), r"\1=[REDACTED]"),
    # Email addresses
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"), "[REDACTED_EMAIL]"),
    # Credit Card Numbers (13-19 digits, possibly hyphen/space separated)
    (re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b"), "[REDACTED_CARD]"),
]


def redact_string(text: str) -> str:
    """Sanitize secrets, tokens, and personal data from a string."""
    if not isinstance(text, str):
        return text
    sanitized = text
    for pattern, replacement in PATTERNS:
        sanitized = pattern.sub(replacement, sanitized)
    return sanitized


def redact_value(value: Any, key_name: str = "") -> Any:
    """Recursively redact sensitive data from strings, dicts, lists, and primitives."""
    if value is None:
        return None

    # If the key itself indicates a sensitive value, redact it immediately
    if key_name and SENSITIVE_KEY_PATTERNS.search(key_name):
        return "[REDACTED_SECRET]"

    if isinstance(value, str):
        return redact_string(value)

    if isinstance(value, dict):
        return {k: redact_value(v, str(k)) for k, v in value.items()}

    if isinstance(value, list):
        return [redact_value(item, key_name) for item in value]

    return value


def sanitize_payload(payload: Union[Dict[str, Any], List[Any], str, None]) -> Any:
    """Entrypoint to sanitize tool inputs, outputs, or configuration dictionaries."""
    if payload is None:
        return None
    return redact_value(payload)
