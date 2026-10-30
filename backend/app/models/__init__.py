"""
SQLAlchemy ORM models for TrustTrace.
Compatible with both SQLite (dev) and PostgreSQL (production).
"""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any, Optional
from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer, JSON,
    String, Text, func
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    input_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    expected_output: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    difficulty: Mapped[str] = mapped_column(String(20), default="medium")
    version: Mapped[str] = mapped_column(String(20), default="1.0")
    is_benchmark: Mapped[bool] = mapped_column(Boolean, default=False)


class FaultScenario(Base):
    __tablename__ = "fault_scenarios"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    probability: Mapped[float] = mapped_column(Float, default=1.0)
    deterministic_step: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    failure_delay_ms: Mapped[int] = mapped_column(Integer, default=0)
    severity: Mapped[str] = mapped_column(String(20), default="medium")
    seed: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Experiment(Base):
    __tablename__ = "experiments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    agent_type: Mapped[str] = mapped_column(String(20), default="mock")
    policy_id: Mapped[str] = mapped_column(String(64), nullable=False)
    scenario_id: Mapped[str] = mapped_column(String(64), ForeignKey("fault_scenarios.id"), nullable=False)
    task_ids: Mapped[list] = mapped_column(JSON, nullable=False)
    repetitions: Mapped[int] = mapped_column(Integer, default=1)
    seed: Mapped[int] = mapped_column(Integer, default=42)
    max_retries: Mapped[int] = mapped_column(Integer, default=3)
    timeout_seconds: Mapped[int] = mapped_column(Integer, default=30)
    token_budget: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cost_budget_usd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    runs: Mapped[list[ExperimentRun]] = relationship("ExperimentRun", back_populates="experiment", cascade="all, delete-orphan")
    scenario: Mapped[FaultScenario] = relationship("FaultScenario")


class ExperimentRun(Base):
    __tablename__ = "experiment_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    experiment_id: Mapped[str] = mapped_column(String(36), ForeignKey("experiments.id"), nullable=False)
    task_id: Mapped[str] = mapped_column(String(64), nullable=False)
    run_number: Mapped[int] = mapped_column(Integer, nullable=False)
    policy_id: Mapped[str] = mapped_column(String(64), nullable=False)
    scenario_id: Mapped[str] = mapped_column(String(64), nullable=False)
    seed: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    outcome: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    token_usage: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    estimated_cost_usd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    config_snapshot: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    experiment: Mapped[Experiment] = relationship("Experiment", back_populates="runs")
    traces: Mapped[list[ExecutionTrace]] = relationship("ExecutionTrace", back_populates="run", cascade="all, delete-orphan")
    recovery_decisions: Mapped[list[RecoveryDecision]] = relationship("RecoveryDecision", back_populates="run", cascade="all, delete-orphan")


class ExecutionTrace(Base):
    __tablename__ = "execution_traces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    run_id: Mapped[str] = mapped_column(String(36), ForeignKey("experiment_runs.id"), nullable=False)
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    tool_name: Mapped[str] = mapped_column(String(100), nullable=False)
    input_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    output_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    fault_injected: Mapped[bool] = mapped_column(Boolean, default=False)
    fault_category: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    diagnosis_category: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    recovery_action: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    retry_number: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    token_usage: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    run: Mapped[ExperimentRun] = relationship("ExperimentRun", back_populates="traces")


class RecoveryDecision(Base):
    __tablename__ = "recovery_decisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    trace_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("execution_traces.id"), nullable=True)
    run_id: Mapped[str] = mapped_column(String(36), ForeignKey("experiment_runs.id"), nullable=False)
    policy_id: Mapped[str] = mapped_column(String(64), nullable=False)
    decision: Mapped[str] = mapped_column(String(64), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    budget_remaining: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    outcome: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    run: Mapped[ExperimentRun] = relationship("ExperimentRun", back_populates="recovery_decisions")


class MetricSummary(Base):
    __tablename__ = "metric_summaries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    experiment_id: Mapped[str] = mapped_column(String(36), ForeignKey("experiments.id"), nullable=False)
    policy_id: Mapped[str] = mapped_column(String(64), nullable=False)
    task_success_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    recovery_success_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    diagnosis_accuracy: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    unsafe_recovery_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    mean_latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    median_latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    p95_latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    avg_retry_count: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_token_usage: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    estimated_cost_usd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sample_size: Mapped[int] = mapped_column(Integer, default=0)
    calculated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class SampleTestCase(Base):
    __tablename__ = "sample_test_cases"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # e.g. "TC-001"
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    fault_category: Mapped[str] = mapped_column(String(64), nullable=False)
    scenario_id: Mapped[str] = mapped_column(String(64), ForeignKey("fault_scenarios.id"), nullable=False)
    expected_recovery: Mapped[str] = mapped_column(String(100), nullable=False)
    recommended_policy_id: Mapped[str] = mapped_column(String(64), nullable=False)
    task_ids: Mapped[list] = mapped_column(JSON, nullable=False)
    default_params: Mapped[dict] = mapped_column(JSON, default=dict)
    is_sample: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    scenario: Mapped[FaultScenario] = relationship("FaultScenario")

