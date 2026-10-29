"""
Experiment Runner — orchestrates multi-run experiments.
Handles single runs, batch runs, and repeated trials.
"""
from __future__ import annotations
import uuid
import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.agents.mock_agent import MockAgent
from app.agents.gemini_agent import GeminiAgent
from app.db import repository as repo
from app.db.repository import save_run_result
from app.services.agent_runner import AgentRunner
from app.services.fault_injector import InjectionConfig, FaultCategory, BUILTIN_SCENARIOS
from app.services.metrics_engine import MetricsEngine

logger = logging.getLogger(__name__)


def _get_agent(agent_type: str):
    if agent_type == "gemini":
        return GeminiAgent()
    return MockAgent()


def _build_injection_config(scenario: Any, seed: int) -> InjectionConfig:
    """Build InjectionConfig from a FaultScenario ORM object."""
    try:
        category = FaultCategory(scenario.category)
    except ValueError:
        category = FaultCategory.NONE

    return InjectionConfig(
        scenario_id=scenario.id,
        category=category,
        probability=scenario.probability,
        deterministic_step=scenario.deterministic_step,
        failure_delay_ms=scenario.failure_delay_ms,
        severity=scenario.severity,
        seed=seed,
    )


class ExperimentRunner:
    """
    Executes an experiment: runs all tasks × repetitions, persists results, computes metrics.
    """

    def __init__(self, db: Session):
        self.db = db
        self.metrics_engine = MetricsEngine()

    def run_experiment(self, experiment_id: str) -> Dict[str, Any]:
        """Execute all runs for an experiment and compute aggregate metrics."""
        experiment = repo.get_experiment(self.db, experiment_id)
        if experiment is None:
            raise ValueError(f"Experiment '{experiment_id}' not found")

        scenario = repo.get_scenario(self.db, experiment.scenario_id)
        if scenario is None:
            raise ValueError(f"Scenario '{experiment.scenario_id}' not found")

        repo.update_experiment_status(self.db, experiment_id, "running")

        agent = _get_agent(experiment.agent_type)
        all_run_ids = []
        run_number = 0

        try:
            for rep in range(experiment.repetitions):
                for task_id in experiment.task_ids:
                    run_number += 1
                    run_id = str(uuid.uuid4())
                    run_seed = experiment.seed + run_number  # Unique seed per run

                    # Get task
                    task = repo.get_task(self.db, task_id)
                    if task is None:
                        logger.warning("Task '%s' not found — skipping", task_id)
                        continue

                    # Build injection config for this run
                    injection_config = _build_injection_config(scenario, run_seed)

                    # Create plan
                    plan = agent.plan(task.id, task.description, task.input_data)

                    # Create runner
                    runner = AgentRunner(
                        run_id=run_id,
                        experiment_id=experiment_id,
                        task_id=task_id,
                        policy_id=experiment.policy_id,
                        injection_config=injection_config,
                        max_retries=experiment.max_retries,
                        timeout_seconds=experiment.timeout_seconds,
                        token_budget=experiment.token_budget,
                        cost_budget_usd=experiment.cost_budget_usd,
                    )

                    # Execute
                    logger.info(
                        "Running experiment=%s task=%s rep=%d run=%d",
                        experiment_id, task_id, rep + 1, run_number
                    )
                    result = runner.run(plan)

                    # Persist
                    save_run_result(self.db, result, run_number=run_number)
                    all_run_ids.append(run_id)

            # Compute and save metrics
            runs = repo.list_runs_for_experiment(self.db, experiment_id)
            traces_by_run = {}
            for run in runs:
                traces_by_run[run.id] = repo.get_traces_for_run(self.db, run.id)

            summary = self.metrics_engine.compute(
                experiment_id=experiment_id,
                policy_id=experiment.policy_id,
                runs=runs,
                traces_by_run=traces_by_run,
            )
            # Remove non-DB fields
            summary_for_db = {k: v for k, v in summary.items()
                              if k not in ("note", "experiment_id", "policy_id")}
            summary_for_db["experiment_id"] = experiment_id
            summary_for_db["policy_id"] = experiment.policy_id
            repo.save_metric_summary(self.db, summary_for_db)

            repo.update_experiment_status(self.db, experiment_id, "completed")
            logger.info("Experiment %s completed: %d runs", experiment_id, run_number)

            return {
                "experiment_id": experiment_id,
                "status": "completed",
                "total_runs": run_number,
                "run_ids": all_run_ids,
                "metrics": summary,
            }

        except Exception as e:
            logger.error("Experiment %s failed: %s", experiment_id, str(e))
            repo.update_experiment_status(self.db, experiment_id, "failed")
            raise
