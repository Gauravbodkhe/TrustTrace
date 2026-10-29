# TrustTrace Security & Privacy Model

## 1. Threat Model & Design Principles

TrustTrace is built under the principle of **Defensive Isolation by Default**:
1. **Zero External Attack Surfaces:** Fault injection is simulated entirely within in-memory mock handlers. TrustTrace never sends malicious payloads, malformed JSON, or floods external endpoints.
2. **Server-Side Credential Boundary:** Third-party credentials (such as Google Gemini API keys or database connection strings) are stored exclusively in backend process environment variables and are never bundled into client-side JavaScript or returned in API responses.
3. **Structured Telemetry Sanitization:** Every tool execution trace passes through a redaction pipeline before persistence. Keys containing keywords such as `password`, `token`, `secret`, `api_key`, or `credential` are replaced with `[REDACTED]`.

---

## 2. API Security Controls

- **CORS Configuration:** Restricts cross-origin requests exclusively to the configured frontend domain (`FRONTEND_URL`).
- **Pydantic Validation:** All incoming payloads are rigorously validated against strict Pydantic models. Malformed JSON or type coercion attacks are rejected with HTTP 422 before reaching the application services.
- **Controlled Concurrency:** Execution budgets enforce strict maximum retry limits and wall-clock execution timeouts (default 30 seconds) to prevent infinite loops, resource starvation, or accidental Denial-of-Service.

---

## 3. Reporting Vulnerabilities

If you discover a security issue or vulnerability in TrustTrace, please submit an issue or contact the maintainers with a reproducible trace log.
