import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  RotateCcw,
  CheckCircle,
  ArrowRightLeft,
  AlertOctagon,
  HelpCircle,
  Coins,
  ArrowRight,
  Zap,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface StrategyCard {
  id: string;
  name: string;
  policyCode: string;
  badge: string;
  badgeColor: string;
  icon: React.ElementType;
  summary: string;
  howItWorks: string;
  bestFor: string;
  tradeoff: string;
  decisionRule: string;
}

const STRATEGIES: StrategyCard[] = [
  {
    id: 'policy_a_baseline_stop',
    name: 'Baseline Stop',
    policyCode: 'Policy A',
    badge: 'Fail Fast',
    badgeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-900',
    icon: AlertOctagon,
    summary: 'Immediately aborts execution upon any tool failure without retrying.',
    howItWorks: 'Detects exception or non-zero status code and halts the agent run, recording the failure trace.',
    bestFor: 'Cost-sensitive tasks where downstream errors compound or when measuring unassisted baseline performance.',
    tradeoff: 'Zero retry cost, but lowest task completion rate (any transient glitch causes complete failure).',
    decisionRule: 'if (step.failed) halt()',
  },
  {
    id: 'policy_b_bounded_retry',
    name: 'Bounded Retry',
    policyCode: 'Policy B',
    badge: 'Most Common',
    badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-900',
    icon: RotateCcw,
    summary: 'Retries the failed operation up to N times with exponential backoff.',
    howItWorks: 'Checks if current retry count is under max limit (typically 3). Pauses with jittered delay and re-executes.',
    bestFor: 'Transient network glitches, brief timeouts, and intermittent external API rate limits.',
    tradeoff: 'Increases latency proportional to retry count; ineffective against deterministic data errors.',
    decisionRule: 'if (retries < max_retries && is_transient) sleep_and_retry() else halt()',
  },
  {
    id: 'policy_c_validation_retry',
    name: 'Validation and Retry',
    policyCode: 'Policy C',
    badge: 'Schema Aware',
    badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    icon: CheckCircle,
    summary: 'Inspects and repairs malformed inputs or schemas before triggering a retry.',
    howItWorks: 'Parses payload against target schema. If fields are missing or types are invalid, corrects parameters before re-invoking.',
    bestFor: 'Malformed JSON outputs, hallucinated tool arguments, and missing required parameters.',
    tradeoff: 'Requires diagnostic parsing overhead, but avoids burning retries on doomed invalid payloads.',
    decisionRule: 'if (validation_failed) repair_payload() && retry()',
  },
  {
    id: 'policy_d_fallback',
    name: 'Fallback Strategy',
    policyCode: 'Policy D',
    badge: 'High Resilience',
    badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
    icon: ArrowRightLeft,
    summary: 'Reroutes failed requests to an alternative tool, cached replica, or secondary provider.',
    howItWorks: 'When primary tool fails (e.g., search_knowledge_base), switches to backup tool (e.g., query_docs_cache).',
    bestFor: 'Third-party service outages, deprecated endpoints, and permanent infrastructure downtime.',
    tradeoff: 'Alternative service may provide degraded fidelity or slightly stale information.',
    decisionRule: 'if (primary.unavailable && has_fallback) route(fallback_service)',
  },
  {
    id: 'policy_e_safe_stop',
    name: 'Safe Stop',
    policyCode: 'Policy E',
    badge: 'Safety Critical',
    badgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200 dark:border-purple-900',
    icon: Shield,
    summary: 'Guarantees execution halts cleanly without side effects when safety constraints are violated.',
    howItWorks: 'Detects permission violations, authentication failures, or risky mutations and freezes execution state securely.',
    bestFor: 'Financial transactions, database mutations, and external communication actions where unsafe retries cause damage.',
    tradeoff: 'Prioritizes safety over completion; zero unauthorized modifications allowed.',
    decisionRule: 'if (security_risk || permission_denied) rollback_and_abort()',
  },
  {
    id: 'policy_f_clarification',
    name: 'Clarification',
    policyCode: 'Policy F',
    badge: 'Human in the Loop',
    badgeColor: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900',
    icon: HelpCircle,
    summary: 'Requests supervisor guidance or missing input when encountering ambiguity.',
    howItWorks: 'Generates a clarifying question detailing the ambiguous condition and pauses for operator input.',
    bestFor: 'Ambiguous entity queries, conflicting user instructions, and high-consequence edge cases.',
    tradeoff: 'Requires external interactive response; pauses autonomous execution pipeline.',
    decisionRule: 'if (ambiguity_score > threshold) prompt_user_for_clarification()',
  },
  {
    id: 'policy_g_budget_aware',
    name: 'Budget-Aware Recovery',
    policyCode: 'Policy G',
    badge: 'Optimal Cost/Utility',
    badgeColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900',
    icon: Coins,
    summary: 'Dynamically adapts recovery decisions based on remaining token, cost, and time budgets.',
    howItWorks: 'Calculates expected utility of retry vs remaining budget. If cost or latency budget is nearly depleted, uses cheap fallback or clean stop.',
    bestFor: 'Production LLM applications with strict SLA deadlines and per-session cost constraints.',
    tradeoff: 'Requires tracking token spend and remaining latency budget during execution.',
    decisionRule: 'if (expected_utility(retry) > cost && budget_remaining) retry() else fallback()',
  },
];

export const RecoveryStrategies: React.FC = () => {
  const navigate = useNavigate();

  const handleLaunchWithStrategy = (policyId: string) => {
    navigate('/experiments/new', {
      state: {
        prefill: {
          policy_id: policyId,
          name: `Evaluation: ${STRATEGIES.find((s) => s.id === policyId)?.name}`,
        },
      },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Recovery Strategies
          </h1>
          <span className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
            7 Formal Policies
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          TrustTrace benchmarks agent resilience across seven standard recovery algorithms. Compare logic, tradeoffs, and launch dedicated experiments.
        </p>
      </div>

      {/* Strategies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {STRATEGIES.map((strategy) => {
          const Icon = strategy.icon;
          return (
            <div
              key={strategy.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                        {strategy.policyCode}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {strategy.name}
                      </h3>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${strategy.badgeColor}`}
                  >
                    {strategy.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  {strategy.summary}
                </p>

                <div className="space-y-2.5 text-xs mb-5">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-mono uppercase">
                      Decision Rule
                    </span>
                    <code className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px] block mt-0.5">
                      {strategy.decisionRule}
                    </code>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-mono uppercase">
                      Recommended For
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {strategy.bestFor}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-mono uppercase">
                      Trade-off
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {strategy.tradeoff}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleLaunchWithStrategy(strategy.id)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white text-slate-800 dark:text-slate-200 py-2 px-3 text-xs font-semibold transition-all cursor-pointer group"
                >
                  <span>Test this Strategy</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
