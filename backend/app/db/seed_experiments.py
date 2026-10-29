"""
Initial experiment seeding script.
Executes standard benchmark trials across Policies A, B, and G on realistic tasks
so that the dashboard has genuine recorded baseline data on first launch.
"""
from app.db import init_db, SessionLocal
from app.db import repository as repo
from app.services.experiment_runner import ExperimentRunner


def seed_initial_benchmark():
    init_db()

    with SessionLocal() as db:
        # Seed tasks and scenarios first
        repo.seed_benchmark_tasks(db)
        repo.seed_scenarios(db)
        db.commit()

        # Check if experiments already exist
        existing = repo.list_experiments(db, limit=1)
        if existing:
            print("Experiments already exist in database — skipping seed.")
            return

        print("Executing initial benchmark experiments across Policies A, B, and G...")

        runner = ExperimentRunner(db)

        # 1. Baseline Stop (Policy A) under Transient Error
        exp_a = repo.create_experiment(db, {
            "name": "Benchmark: Baseline Stop under Transient Faults",
            "description": "Baseline control testing Policy A against transient 503 service faults.",
            "agent_type": "mock",
            "policy_id": "policy_a_baseline_stop",
            "scenario_id": "transient_error_step1",
            "task_ids": ["task_expense_policy", "task_order_lookup"],
            "repetitions": 1,
            "seed": 42,
            "max_retries": 3,
            "timeout_seconds": 30,
            "token_budget": 2000,
            "cost_budget_usd": None,
        })
        db.commit()
        runner.run_experiment(exp_a.id)
        db.commit()
        print(f"Executed Experiment A ({exp_a.id})")

        # 2. Bounded Retry (Policy B) under Transient Error
        exp_b = repo.create_experiment(db, {
            "name": "Benchmark: Bounded Retry under Transient Faults",
            "description": "Evaluating Policy B retry backoff against transient 503 errors.",
            "agent_type": "mock",
            "policy_id": "policy_b_bounded_retry",
            "scenario_id": "transient_error_step1",
            "task_ids": ["task_expense_policy", "task_order_lookup"],
            "repetitions": 1,
            "seed": 42,
            "max_retries": 3,
            "timeout_seconds": 30,
            "token_budget": 2000,
            "cost_budget_usd": None,
        })
        db.commit()
        runner.run_experiment(exp_b.id)
        db.commit()
        print(f"Executed Experiment B ({exp_b.id})")

        # 3. Budget-Aware (Policy G) under Tool Unavailable (Fallback)
        exp_g = repo.create_experiment(db, {
            "name": "Benchmark: Policy G Budget-Aware with Secondary Fallback",
            "description": "Evaluating Policy G fallback to secondary search tool when primary is unavailable.",
            "agent_type": "mock",
            "policy_id": "policy_g_budget_aware",
            "scenario_id": "tool_unavailable_step2",
            "task_ids": ["task_expense_policy", "task_refund_policy"],
            "repetitions": 1,
            "seed": 42,
            "max_retries": 3,
            "timeout_seconds": 30,
            "token_budget": 2000,
            "cost_budget_usd": None,
        })
        db.commit()
        runner.run_experiment(exp_g.id)
        db.commit()
        print(f"Executed Experiment G ({exp_g.id})")

        print("Benchmark seeding completed successfully with 100% recorded empirical data!")


if __name__ == "__main__":
    seed_initial_benchmark()
