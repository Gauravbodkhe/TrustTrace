"""
Mock Agent — deterministic, seed-based agent for testing without API credentials.

Produces realistic multi-step tool-use plans based on task category.
Plans are deterministic given the same task — no randomness or external calls.
"""
from __future__ import annotations
from typing import Any, Dict
from app.agents.base_agent import BaseAgent, AgentPlan, AgentStep


class MockAgent(BaseAgent):
    """
    Deterministic mock agent that generates realistic tool-call sequences.
    
    Covers all task categories in the benchmark dataset.
    Does not require any AI API key or external service.
    """

    TASK_PLANS: Dict[str, list] = {
        # ── Knowledge retrieval tasks ──────────────────────────────────────
        "task_expense_policy": [
            AgentStep("search_knowledge_base", {"query": "expense policy limit receipt"},
                      "Search for expense policy details"),
            AgentStep("generate_answer",
                      {"question": "What is the expense policy?", "context": []},
                      "Synthesize answer from search results"),
        ],
        "task_refund_policy": [
            AgentStep("search_knowledge_base", {"query": "refund policy customer days"},
                      "Search for refund policy"),
            AgentStep("generate_answer",
                      {"question": "What is the refund policy?", "context": []},
                      "Generate answer"),
        ],
        "task_onboarding": [
            AgentStep("search_knowledge_base", {"query": "onboarding employee hr forms"},
                      "Search onboarding guide"),
            AgentStep("generate_answer",
                      {"question": "What are the onboarding steps?", "context": []},
                      "Summarize onboarding"),
        ],
        # ── Record lookup tasks ────────────────────────────────────────────
        "task_user_lookup": [
            AgentStep("get_record", {"record_id": "USR-001"},
                      "Retrieve user record"),
            AgentStep("validate_data",
                      {"data": {}, "rules": [{"field": "active", "required": True}]},
                      "Validate user record"),
            AgentStep("generate_answer",
                      {"question": "Who is user USR-001?", "context": []},
                      "Generate user summary"),
        ],
        "task_order_lookup": [
            AgentStep("get_record", {"record_id": "ORD-001"},
                      "Retrieve order record"),
            AgentStep("validate_data",
                      {"data": {}, "rules": [{"field": "status", "required": True},
                                              {"field": "amount", "required": True, "min": 0}]},
                      "Validate order data"),
            AgentStep("generate_answer",
                      {"question": "What is the status of order ORD-001?", "context": []},
                      "Generate order summary"),
        ],
        # ── Calculation tasks ─────────────────────────────────────────────
        "task_cost_analysis": [
            AgentStep("calculate_result",
                      {"operation": "sum", "operands": [149.99, 299.99, 99.99]},
                      "Calculate total cost of orders"),
            AgentStep("calculate_result",
                      {"operation": "average", "operands": [149.99, 299.99, 99.99]},
                      "Calculate average order value"),
            AgentStep("generate_answer",
                      {"question": "What is the total and average order cost?", "context": []},
                      "Summarize cost analysis"),
        ],
        "task_inventory_count": [
            AgentStep("calculate_result",
                      {"operation": "count", "operands": [1, 2, 3, 4, 5]},
                      "Count inventory items"),
            AgentStep("calculate_result",
                      {"operation": "max", "operands": [29.99, 49.99, 99.99]},
                      "Find highest-priced item"),
            AgentStep("generate_answer",
                      {"question": "How many items are in inventory and what is the most expensive?",
                       "context": []},
                      "Summarize inventory"),
        ],
        # ── Validation tasks ──────────────────────────────────────────────
        "task_data_validation": [
            AgentStep("validate_data",
                      {"data": {"amount": 250.00, "category": "travel", "approved": True},
                       "rules": [
                           {"field": "amount", "required": True, "min": 0, "max": 500},
                           {"field": "category", "required": True},
                       ]},
                      "Validate expense claim data"),
            AgentStep("generate_answer",
                      {"question": "Is the expense claim valid?", "context": []},
                      "Summarize validation result"),
        ],
        "task_schema_check": [
            AgentStep("validate_data",
                      {"data": {"name": "Alice", "age": 30, "department": "Engineering"},
                       "rules": [
                           {"field": "name", "required": True},
                           {"field": "age", "required": True, "min": 18, "max": 65},
                           {"field": "department", "required": True},
                       ]},
                      "Check employee record schema"),
            AgentStep("generate_answer",
                      {"question": "Does the employee record pass validation?", "context": []},
                      "Generate validation report"),
        ],
        # ── Multi-step research tasks ──────────────────────────────────────
        "task_policy_research": [
            AgentStep("search_knowledge_base", {"query": "company policy safety procedures"},
                      "Search for relevant policies"),
            AgentStep("search_knowledge_base", {"query": "product catalog pricing"},
                      "Search for product information"),
            AgentStep("generate_answer",
                      {"question": "Summarize the key company policies and product pricing",
                       "context": []},
                      "Synthesize multi-topic answer"),
        ],
        "task_comprehensive_lookup": [
            AgentStep("get_record", {"record_id": "USR-002"},
                      "Get manager record"),
            AgentStep("get_record", {"record_id": "ORD-002"},
                      "Get manager's order"),
            AgentStep("validate_data",
                      {"data": {"manager_id": "USR-002", "order_id": "ORD-002"},
                       "rules": [{"field": "manager_id", "required": True},
                                  {"field": "order_id", "required": True}]},
                      "Cross-validate manager and order"),
            AgentStep("generate_answer",
                      {"question": "Provide a complete summary of manager USR-002 and their orders",
                       "context": []},
                      "Generate comprehensive report"),
        ],
    }

    # Default fallback plan for unknown task IDs
    DEFAULT_PLAN = [
        AgentStep("list_available_tools", {},
                  "Check available tools for this task"),
        AgentStep("search_knowledge_base", {"query": "general information"},
                  "Search for relevant information"),
        AgentStep("generate_answer",
                  {"question": "Complete the assigned task", "context": []},
                  "Generate answer based on gathered information"),
    ]

    @property
    def agent_type(self) -> str:
        return "mock"

    def plan(self, task_id: str, task_description: str, task_input: Dict[str, Any]) -> AgentPlan:
        steps = list(self.TASK_PLANS.get(task_id, self.DEFAULT_PLAN))

        # Inject task context into generate_answer steps
        for step in steps:
            if step.tool_name == "generate_answer":
                step.tool_inputs = {
                    "question": task_description or step.tool_inputs.get("question", ""),
                    "context": task_input.get("context", step.tool_inputs.get("context", [])),
                }

        return AgentPlan(
            task_id=task_id,
            task_description=task_description,
            steps=steps,
            agent_type=self.agent_type,
            model_info="MockAgent v1.0 (deterministic, no API required)",
        )
