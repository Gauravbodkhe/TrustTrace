"""
Gemini Agent — optional AI-powered agent using Google Gemini API.
Falls back gracefully when no API key is configured.
"""
from __future__ import annotations
import logging
import re
from typing import Any, Dict

from app.agents.base_agent import BaseAgent, AgentPlan, AgentStep
from app.agents.mock_agent import MockAgent
from app.core.config import settings
from app.tools.registry import TOOL_REGISTRY

logger = logging.getLogger(__name__)


class GeminiAgent(BaseAgent):
    """
    Agent that uses Google Gemini to plan tool-use sequences.

    When GOOGLE_API_KEY is not configured, falls back to MockAgent behavior.
    API key is read server-side only — never exposed to the frontend.
    """

    def __init__(self):
        self._client = None
        self._mock_fallback = MockAgent()
        self._available = False

        if settings.gemini_available:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GOOGLE_API_KEY)
                self._client = genai.GenerativeModel(settings.GEMINI_MODEL)
                self._available = True
                logger.info("Gemini agent initialized with model %s", settings.GEMINI_MODEL)
            except Exception as e:
                logger.warning("Gemini initialization failed: %s — falling back to mock agent", type(e).__name__)
        else:
            logger.info("GOOGLE_API_KEY not configured — GeminiAgent will use mock fallback")

    @property
    def agent_type(self) -> str:
        return "gemini"

    @property
    def is_available(self) -> bool:
        return self._available

    def plan(self, task_id: str, task_description: str, task_input: Dict[str, Any]) -> AgentPlan:
        if not self._available:
            logger.info("Gemini unavailable — using mock plan for task '%s'", task_id)
            plan = self._mock_fallback.plan(task_id, task_description, task_input)
            plan.agent_type = "gemini_mock_fallback"
            plan.model_info = f"GeminiAgent (API unavailable) — using MockAgent fallback"
            return plan

        try:
            return self._gemini_plan(task_id, task_description, task_input)
        except Exception as e:
            logger.warning("Gemini planning failed (%s): %s — using mock fallback", type(e).__name__, str(e)[:200])
            plan = self._mock_fallback.plan(task_id, task_description, task_input)
            plan.agent_type = "gemini_error_fallback"
            plan.model_info = f"GeminiAgent (error: {type(e).__name__}) — using MockAgent fallback"
            return plan

    def _gemini_plan(self, task_id: str, task_description: str, task_input: Dict[str, Any]) -> AgentPlan:
        """Call Gemini API to generate a tool-use plan."""
        tools_description = "\n".join(
            f"- {name}: {td.description} | inputs: {td.input_schema}"
            for name, td in TOOL_REGISTRY.items()
        )

        prompt = f"""You are a task-planning agent. Given a task, output a list of tool calls to complete it.

Available tools:
{tools_description}

Task ID: {task_id}
Task description: {task_description}
Task input: {task_input}

Output format — respond with ONLY a JSON array of steps:
[
  {{"tool": "tool_name", "inputs": {{}}, "reasoning": "why this step"}}
]

Use only the tools listed above. Keep steps minimal and purposeful."""

        response = self._client.generate_content(prompt)
        text = response.text.strip()

        # Extract JSON from response
        json_match = re.search(r'\[.*\]', text, re.DOTALL)
        if not json_match:
            raise ValueError("Gemini response did not contain a valid JSON array")

        import json
        steps_data = json.loads(json_match.group())

        steps = []
        for item in steps_data:
            tool_name = item.get("tool", "")
            if tool_name not in TOOL_REGISTRY:
                logger.warning("Gemini suggested unknown tool '%s' — skipping", tool_name)
                continue
            steps.append(AgentStep(
                tool_name=tool_name,
                tool_inputs=item.get("inputs", {}),
                reasoning=item.get("reasoning", ""),
            ))

        if not steps:
            raise ValueError("Gemini returned no valid tool steps")

        # Record usage metadata if available (never fabricate)
        model_info = settings.GEMINI_MODEL
        try:
            if hasattr(response, 'usage_metadata') and response.usage_metadata:
                um = response.usage_metadata
                model_info += f" | tokens: {um.total_token_count}"
        except Exception:
            pass

        return AgentPlan(
            task_id=task_id,
            task_description=task_description,
            steps=steps,
            agent_type=self.agent_type,
            model_info=model_info,
        )
