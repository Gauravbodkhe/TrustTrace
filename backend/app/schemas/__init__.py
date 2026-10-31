"""
TrustTrace Pydantic Schemas — request/response models for the API.
"""
from __future__ import annotations
from datetime import datetime
from typing import Any, Optional, List, Dict
from pydantic import BaseModel, Field, ConfigDict
import uuid


# ─────────────────────────── Shared ────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    database: str
    db_type: Optional[str] = "sqlite"
    gemini_available: bool
    mock_mode: bool
    timestamp: datetime


# ─────────────────────────── Tasks ─────────────────────────────────────────

class TaskSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str
    category: str
    input_data: Dict[str, Any]
    expected_output: Optional[Dict[str, Any]] = None
    difficulty: str = "medium"
    version: str = "1.0"
    is_benchmark: bool = False


# ─────────────────────────── Fault Scenarios ───────────────────────────────

class ScenarioCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    category: str
    probability: float = Field(1.0, ge=0.0, le=1.0)
    deterministic_step: Optional[int] = None
    failure_delay_ms: int = Field(0, ge=0)
    severity: str = "medium"
    seed: Optional[int] = None


class ScenarioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    probability: Optional[float] = Field(None, ge=0.0, le=1.0)
    deterministic_step: Optional[int] = None
    failure_delay_ms: Optional[int] = None
    severity: Optional[str] = None
    is_active: Optional[bool] = None


class ScenarioSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str
    category: str
    probability: float
    deterministic_step: Optional[int]
    failure_delay_ms: int
    severity: str
    seed: Optional[int]
    is_active: bool


# ─────────────────────────── Experiments ───────────────────────────────────

class ExperimentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=300)
    hypothesis: Optional[str] = ""
    description: str = ""
    agent_type: str = Field("mock", pattern="^(mock|gemini)$")
    policy_id: str
    scenario_id: str
    task_ids: List[str] = Field(..., min_length=1)
    repetitions: int = Field(1, ge=1, le=100)
    seed: int = Field(42, ge=0)
    max_retries: int = Field(3, ge=0, le=20)
    timeout_seconds: int = Field(30, ge=5, le=300)
    token_budget: Optional[int] = Field(None, ge=1)
    cost_budget_usd: Optional[float] = Field(None, ge=0.0)


class ExperimentSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    hypothesis: Optional[str] = ""
    description: str
    agent_type: str
    policy_id: str
    scenario_id: str
    task_ids: List[str]
    repetitions: int
    seed: int
    max_retries: int
    timeout_seconds: int
    token_budget: Optional[int]
    cost_budget_usd: Optional[float]
    status: str
    created_at: datetime
    updated_at: datetime


class ExperimentListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    agent_type: str
    policy_id: str
    scenario_id: str
    status: str
    repetitions: int
    created_at: datetime


# ─────────────────────────── Experiment Runs ───────────────────────────────

class RunSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    experiment_id: str
    task_id: str
    run_number: int
    policy_id: str
    scenario_id: str
    seed: int
    status: str
    outcome: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration_ms: Optional[int]
    retry_count: int
    token_usage: Optional[int]
    estimated_cost_usd: Optional[float]
    error_message: Optional[str]


# ─────────────────────────── Execution Traces ──────────────────────────────

class TraceStepSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    run_id: str
    step_number: int
    tool_name: str
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]]
    status: str
    fault_injected: bool
    fault_category: Optional[str]
    diagnosis_category: Optional[str]
    recovery_action: Optional[str]
    retry_number: int
    started_at: datetime
    ended_at: Optional[datetime]
    latency_ms: Optional[int]
    token_usage: Optional[int]


class RecoveryDecisionSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    trace_id: Optional[str]
    run_id: str
    policy_id: str
    decision: str
    reason: str
    budget_remaining: Optional[Dict[str, Any]]
    outcome: Optional[str]
    created_at: datetime


# ─────────────────────────── Metrics ───────────────────────────────────────

class MetricSummarySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    experiment_id: str
    policy_id: str
    task_success_rate: Optional[float]
    recovery_success_rate: Optional[float]
    diagnosis_accuracy: Optional[float]
    unsafe_recovery_rate: Optional[float]
    mean_latency_ms: Optional[float]
    median_latency_ms: Optional[float]
    p95_latency_ms: Optional[float]
    avg_retry_count: Optional[float]
    total_token_usage: Optional[int]
    estimated_cost_usd: Optional[float]
    sample_size: int
    calculated_at: datetime


class PolicyComparisonRow(BaseModel):
    policy_id: str
    policy_name: str
    sample_size: int
    task_success_rate: Optional[float]
    recovery_success_rate: Optional[float]
    unsafe_recovery_rate: Optional[float]
    mean_latency_ms: Optional[float]
    avg_retry_count: Optional[float]
    estimated_cost_usd: Optional[float]


class PolicyComparisonResponse(BaseModel):
    experiment_id: str
    experiment_name: str
    task_ids: List[str]
    scenario_id: str
    policies: List[PolicyComparisonRow]
    note: str = (
        "All metrics are computed from actual recorded runs in this experiment. "
        "Results are reproducible using the stored seed and configuration."
    )


# ─────────────────────────── Exports ───────────────────────────────────────

class ExportMetadata(BaseModel):
    export_type: str
    experiment_id: str
    generated_at: datetime
    run_count: int
    note: str = "Export contains only recorded run data. No fabricated results."


# ─────────────────────────── Sample Test Cases ─────────────────────────────

class SampleTestCaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str
    fault_category: str
    scenario_id: str
    expected_recovery: str
    recommended_policy_id: str
    task_ids: List[str]
    default_params: Dict[str, Any] = Field(default_factory=dict)
    is_sample: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SampleTestCaseCreate(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field("", max_length=2000)
    fault_category: str
    scenario_id: str
    expected_recovery: str
    recommended_policy_id: str
    task_ids: List[str] = Field(default_factory=list)
    default_params: Dict[str, Any] = Field(default_factory=dict)
    is_sample: bool = False


class SampleTestCaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    fault_category: Optional[str] = None
    scenario_id: Optional[str] = None
    expected_recovery: Optional[str] = None
    recommended_policy_id: Optional[str] = None
    task_ids: Optional[List[str]] = None
    default_params: Optional[Dict[str, Any]] = None


# ─────────────────────────── Authentication ────────────────────────────────

class UserLogin(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=4)


class UserRegister(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=4)
    name: Optional[str] = "Researcher"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: str
    role: str
    is_active: bool
    created_at: Optional[datetime] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


