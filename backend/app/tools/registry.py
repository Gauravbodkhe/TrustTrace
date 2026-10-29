"""
Simulated tools registry and tool implementations for TrustTrace.

All tools operate on in-memory simulated data — no external services are contacted.
Each tool has:
  - A defined input schema (dict with typed fields)
  - A defined output schema
  - Deterministic behavior based on input
  - Named failure behaviors (triggered by fault injection)
"""
from __future__ import annotations
import time
import random
import hashlib
from typing import Any, Optional, Dict, Callable
from dataclasses import dataclass, field
from enum import Enum


class ToolStatus(str, Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    TIMEOUT = "timeout"
    UNAVAILABLE = "unavailable"


@dataclass
class ToolResult:
    status: ToolStatus
    output: Optional[Dict[str, Any]]
    error_message: Optional[str] = None
    latency_ms: int = 0
    token_usage: Optional[int] = None


@dataclass
class ToolDefinition:
    name: str
    description: str
    input_schema: Dict[str, str]   # field_name -> type_description
    output_schema: Dict[str, str]  # field_name -> type_description
    handler: Callable
    fallback_tool: Optional[str] = None


# ─────────────────────────── Simulated Knowledge Base ──────────────────────

_KNOWLEDGE_BASE = {
    "company_policy": {
        "title": "Company Expense Policy",
        "content": "Employees may expense up to $500 per month without receipts. "
                   "Travel expenses require pre-approval. Software subscriptions must be approved by IT.",
        "version": "2.1",
        "last_updated": "2024-01-15",
    },
    "product_catalog": {
        "title": "Product Catalog Q1 2024",
        "content": "Widget A: $29.99, Widget B: $49.99, Premium Widget: $99.99",
        "version": "1.4",
        "last_updated": "2024-03-01",
    },
    "onboarding_guide": {
        "title": "Employee Onboarding Guide",
        "content": "Complete HR forms on day 1. Meet your manager on day 2. "
                   "Complete security training within 7 days.",
        "version": "3.0",
        "last_updated": "2024-02-20",
    },
    "refund_policy": {
        "title": "Customer Refund Policy",
        "content": "Refunds accepted within 30 days of purchase with receipt. "
                   "No refunds after 30 days except for defective products.",
        "version": "1.2",
        "last_updated": "2023-11-10",
    },
    "safety_procedures": {
        "title": "Workplace Safety Procedures",
        "content": "All incidents must be reported within 24 hours. "
                   "Emergency exits are on floors 1 and 3. Fire drills occur quarterly.",
        "version": "4.1",
        "last_updated": "2024-04-05",
    },
}

_RECORDS = {
    "USR-001": {"id": "USR-001", "name": "Alice Johnson", "role": "Engineer", "department": "Engineering", "active": True},
    "USR-002": {"id": "USR-002", "name": "Bob Smith", "role": "Manager", "department": "Sales", "active": True},
    "USR-003": {"id": "USR-003", "name": "Carol White", "role": "Analyst", "department": "Finance", "active": False},
    "ORD-001": {"id": "ORD-001", "customer": "USR-001", "amount": 149.99, "status": "shipped", "items": 3},
    "ORD-002": {"id": "ORD-002", "customer": "USR-002", "amount": 299.99, "status": "pending", "items": 5},
    "TKT-001": {"id": "TKT-001", "title": "Login issue", "status": "open", "priority": "high", "assignee": "USR-001"},
}


# ─────────────────────────── Tool Handlers ─────────────────────────────────

def _search_knowledge_base(inputs: Dict[str, Any]) -> ToolResult:
    """Search the simulated knowledge base by query."""
    t0 = time.perf_counter()
    query = str(inputs.get("query", "")).lower()

    results = []
    for key, doc in _KNOWLEDGE_BASE.items():
        if query in doc["title"].lower() or query in doc["content"].lower() or query in key:
            results.append({
                "id": key,
                "title": doc["title"],
                "snippet": doc["content"][:150] + "...",
                "version": doc["version"],
            })

    latency_ms = int((time.perf_counter() - t0) * 1000)
    return ToolResult(
        status=ToolStatus.SUCCESS,
        output={"results": results, "count": len(results), "query": inputs.get("query", "")},
        latency_ms=latency_ms,
        token_usage=len(query) // 4 + 50,
    )


def _get_record(inputs: Dict[str, Any]) -> ToolResult:
    """Retrieve a record by ID."""
    t0 = time.perf_counter()
    record_id = str(inputs.get("record_id", ""))
    record = _RECORDS.get(record_id)
    latency_ms = int((time.perf_counter() - t0) * 1000)

    if record is None:
        return ToolResult(
            status=ToolStatus.FAILURE,
            output=None,
            error_message=f"Record '{record_id}' not found",
            latency_ms=latency_ms,
        )

    return ToolResult(
        status=ToolStatus.SUCCESS,
        output={"record": record, "record_id": record_id},
        latency_ms=latency_ms,
        token_usage=80,
    )


def _validate_data(inputs: Dict[str, Any]) -> ToolResult:
    """Validate structured data against basic rules."""
    t0 = time.perf_counter()
    data = inputs.get("data", {})
    rules = inputs.get("rules", [])

    errors = []
    if isinstance(data, dict):
        for rule in rules:
            field_name = rule.get("field")
            required = rule.get("required", False)
            min_val = rule.get("min")
            max_val = rule.get("max")

            if required and field_name not in data:
                errors.append(f"Required field '{field_name}' is missing")
            if field_name in data and min_val is not None:
                if isinstance(data[field_name], (int, float)) and data[field_name] < min_val:
                    errors.append(f"Field '{field_name}' value {data[field_name]} is below minimum {min_val}")
            if field_name in data and max_val is not None:
                if isinstance(data[field_name], (int, float)) and data[field_name] > max_val:
                    errors.append(f"Field '{field_name}' value {data[field_name]} exceeds maximum {max_val}")

    latency_ms = int((time.perf_counter() - t0) * 1000)
    is_valid = len(errors) == 0
    return ToolResult(
        status=ToolStatus.SUCCESS,
        output={"valid": is_valid, "errors": errors, "error_count": len(errors)},
        latency_ms=latency_ms,
        token_usage=60,
    )


def _calculate_result(inputs: Dict[str, Any]) -> ToolResult:
    """Perform a safe arithmetic calculation."""
    t0 = time.perf_counter()
    operation = inputs.get("operation", "")
    operands = inputs.get("operands", [])

    try:
        if not operands:
            return ToolResult(
                status=ToolStatus.FAILURE,
                output=None,
                error_message="No operands provided",
                latency_ms=int((time.perf_counter() - t0) * 1000),
            )

        ops_map = {
            "sum": sum(operands),
            "average": sum(operands) / len(operands),
            "product": __import__("functools").reduce(lambda a, b: a * b, operands, 1),
            "max": max(operands),
            "min": min(operands),
            "count": len(operands),
        }

        if operation not in ops_map:
            return ToolResult(
                status=ToolStatus.FAILURE,
                output=None,
                error_message=f"Unknown operation '{operation}'. Supported: {list(ops_map.keys())}",
                latency_ms=int((time.perf_counter() - t0) * 1000),
            )

        result = ops_map[operation]
        latency_ms = int((time.perf_counter() - t0) * 1000)
        return ToolResult(
            status=ToolStatus.SUCCESS,
            output={"result": result, "operation": operation, "operand_count": len(operands)},
            latency_ms=latency_ms,
            token_usage=40,
        )
    except (ZeroDivisionError, ValueError) as e:
        return ToolResult(
            status=ToolStatus.FAILURE,
            output=None,
            error_message=str(e),
            latency_ms=int((time.perf_counter() - t0) * 1000),
        )


def _generate_answer(inputs: Dict[str, Any]) -> ToolResult:
    """Generate a structured final answer from gathered context."""
    t0 = time.perf_counter()
    question = str(inputs.get("question", ""))
    context = inputs.get("context", [])

    if not question:
        return ToolResult(
            status=ToolStatus.FAILURE,
            output=None,
            error_message="Question is required",
            latency_ms=int((time.perf_counter() - t0) * 1000),
        )

    # Deterministic answer generation based on question hash
    q_hash = hashlib.md5(question.encode()).hexdigest()[:8]
    answer_parts = []

    for ctx in context:
        if isinstance(ctx, dict) and "content" in ctx:
            answer_parts.append(f"Based on the available information: {ctx['content'][:100]}")
        elif isinstance(ctx, str):
            answer_parts.append(ctx[:100])

    if not answer_parts:
        answer_parts = [f"Answer generated for query (ref: {q_hash}): No additional context was provided."]

    answer = " ".join(answer_parts[:3])
    latency_ms = int((time.perf_counter() - t0) * 1000)

    return ToolResult(
        status=ToolStatus.SUCCESS,
        output={
            "answer": answer,
            "question": question,
            "context_items_used": len(context),
            "confidence": "medium" if context else "low",
            "reference_id": q_hash,
        },
        latency_ms=latency_ms,
        token_usage=len(question) // 4 + len(answer) // 4 + 100,
    )


def _list_available_tools(inputs: Dict[str, Any]) -> ToolResult:
    """List all registered tools and their descriptions."""
    t0 = time.perf_counter()
    tools_info = [
        {"name": name, "description": td.description, "has_fallback": td.fallback_tool is not None}
        for name, td in TOOL_REGISTRY.items()
    ]
    latency_ms = int((time.perf_counter() - t0) * 1000)
    return ToolResult(
        status=ToolStatus.SUCCESS,
        output={"tools": tools_info, "count": len(tools_info)},
        latency_ms=latency_ms,
    )


def _search_knowledge_base_v2(inputs: Dict[str, Any]) -> ToolResult:
    """Fallback alternative to search_knowledge_base — uses broader matching."""
    modified_inputs = dict(inputs)
    # Broader search: match any word in query
    query_words = str(inputs.get("query", "")).lower().split()
    modified_inputs["query"] = query_words[0] if query_words else ""
    result = _search_knowledge_base(modified_inputs)
    if result.output:
        result.output["search_mode"] = "fallback_broad"
    return result


# ─────────────────────────── Tool Registry ─────────────────────────────────

TOOL_REGISTRY: Dict[str, ToolDefinition] = {
    "search_knowledge_base": ToolDefinition(
        name="search_knowledge_base",
        description="Search the simulated knowledge base by natural language query",
        input_schema={"query": "string — the search query"},
        output_schema={"results": "list of matching documents", "count": "int"},
        handler=_search_knowledge_base,
        fallback_tool="search_knowledge_base_v2",
    ),
    "search_knowledge_base_v2": ToolDefinition(
        name="search_knowledge_base_v2",
        description="Broader fallback search for the knowledge base",
        input_schema={"query": "string — the search query"},
        output_schema={"results": "list of matching documents", "count": "int", "search_mode": "string"},
        handler=_search_knowledge_base_v2,
        fallback_tool=None,
    ),
    "get_record": ToolDefinition(
        name="get_record",
        description="Retrieve a specific record by its ID (USR-*, ORD-*, TKT-*)",
        input_schema={"record_id": "string — the record identifier"},
        output_schema={"record": "dict with record fields", "record_id": "string"},
        handler=_get_record,
        fallback_tool=None,
    ),
    "validate_data": ToolDefinition(
        name="validate_data",
        description="Validate structured data against a set of rules",
        input_schema={"data": "dict to validate", "rules": "list of rule objects"},
        output_schema={"valid": "bool", "errors": "list of strings", "error_count": "int"},
        handler=_validate_data,
        fallback_tool=None,
    ),
    "calculate_result": ToolDefinition(
        name="calculate_result",
        description="Perform arithmetic operations: sum, average, product, max, min, count",
        input_schema={"operation": "string", "operands": "list of numbers"},
        output_schema={"result": "number", "operation": "string", "operand_count": "int"},
        handler=_calculate_result,
        fallback_tool=None,
    ),
    "generate_answer": ToolDefinition(
        name="generate_answer",
        description="Generate a structured final answer from question and gathered context",
        input_schema={"question": "string", "context": "list of context objects"},
        output_schema={"answer": "string", "confidence": "string", "context_items_used": "int"},
        handler=_generate_answer,
        fallback_tool=None,
    ),
    "list_available_tools": ToolDefinition(
        name="list_available_tools",
        description="List all registered tools and their descriptions",
        input_schema={},
        output_schema={"tools": "list", "count": "int"},
        handler=_list_available_tools,
        fallback_tool=None,
    ),
}


def get_tool(name: str) -> Optional[ToolDefinition]:
    """Get a tool definition by name."""
    return TOOL_REGISTRY.get(name)


def execute_tool(name: str, inputs: Dict[str, Any]) -> ToolResult:
    """Execute a registered tool by name."""
    tool = get_tool(name)
    if tool is None:
        return ToolResult(
            status=ToolStatus.FAILURE,
            output=None,
            error_message=f"Tool '{name}' is not registered",
        )
    return tool.handler(inputs)
