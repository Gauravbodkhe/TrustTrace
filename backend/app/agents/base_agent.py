"""
Base Agent Interface for TrustTrace.
All agent implementations (mock, gemini) must extend BaseAgent.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class AgentStep:
    """A single step in the agent's execution plan."""
    tool_name: str
    tool_inputs: Dict[str, Any]
    reasoning: str = ""


@dataclass
class AgentPlan:
    """The agent's plan for completing a task."""
    task_id: str
    task_description: str
    steps: List[AgentStep]
    agent_type: str
    model_info: Optional[str] = None


class BaseAgent(ABC):
    """
    Abstract base agent. Produces an execution plan given a task.
    The agent runner executes the plan, injecting faults and applying recovery policies.
    """

    @abstractmethod
    def plan(self, task_id: str, task_description: str, task_input: Dict[str, Any]) -> AgentPlan:
        """
        Generate an ordered list of tool calls to complete the task.
        Does NOT execute tools — that is the agent runner's responsibility.
        """
        ...

    @property
    @abstractmethod
    def agent_type(self) -> str:
        """Return the agent type identifier."""
        ...
