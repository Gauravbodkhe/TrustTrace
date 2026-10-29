# TrustTrace Research Methodology & Benchmark Protocol

## 1. Research Question & Hypothesis

### Primary Research Question
> *"Can a budget-aware, safety-constrained recovery policy improve task completion for tool-using AI agents without disproportionate increases in latency, API cost, or unsafe recovery decisions?"*

### Research Hypothesis
A policy that conditions recovery decisions on:
1. Grounded failure category (transient vs. permanent vs. unsafe)
2. Remaining retry and latency budget
3. Secondary tool availability (fallback mechanisms)
4. Data integrity and schema constraints

will achieve higher recovery success and lower unsafe completion rates than naive retries or blanket stops, while maintaining acceptable latency bounds.

---

## 2. Experimental Variables

### Independent Variables
- **Recovery Policy:**
  - Policy A: Baseline Stop
  - Policy B: Bounded Retry (exponential backoff)
  - Policy C: Validation and Retry
  - Policy D: Tool Fallback
  - Policy E: Safe Stop
  - Policy F: Human-in-the-Loop Clarification
  - Policy G: Proposed Budget-Aware Recovery
- **Fault Scenario:** 10 standard fault categories (deterministic step injection vs. probabilistic rates).
- **Task Category:** Knowledge retrieval, record lookup, calculation, data validation, and multi-step research.

### Dependent Variables
1. **Task Success Rate ($S_{task}$):** Proportion of runs that achieved their intended terminal state.
2. **Recovery Success Rate ($S_{rec}$):** Proportion of runs where at least one tool call failed, but the agent successfully recovered.
3. **Unsafe Recovery Rate ($U_{rec}$):** Proportion of runs that completed while violating safety constraints or accepting corrupt/invalid data.
4. **Diagnosis Accuracy ($A_{diag}$):** Ratio of correctly classified failure categories against known ground truth.
5. **Mean Execution Duration ($L_{mean}$):** Wall-clock duration in milliseconds per trial.
6. **Retry Consumption ($R_{mean}$):** Average number of retries consumed per run.
7. **Token / Cost Consumption:** Token count and estimated dollar cost (reported only when authentic provider telemetry is available).

### Controlled Variables
- Random seed for reproducible injection.
- Execution timeout limits ($30\text{s}$ baseline).
- Standard benchmark task inputs.
- Hardware runtime environment.

---

## 3. Mathematical Metric Definitions

$$\text{Task Success Rate} = \frac{\sum_{i=1}^N \mathbb{I}(\text{outcome}_i = \text{success})}{N}$$

$$\text{Recovery Success Rate} = \frac{\sum_{i=1}^N \mathbb{I}(\text{had\_fault}_i \land \text{outcome}_i = \text{success})}{\sum_{i=1}^N \mathbb{I}(\text{had\_fault}_i)}$$

$$\text{Diagnosis Accuracy} = \frac{\sum_{j=1}^M \mathbb{I}(\hat{c}_j = c_j^*)}{M}$$
*where $\hat{c}_j$ is the diagnosed category and $c_j^*$ is the ground-truth injected fault category.*

$$\text{Unsafe Recovery Rate} = \frac{\sum_{i=1}^N \mathbb{I}(\text{outcome}_i = \text{unsafe})}{N}$$

---

## 4. Threats to Validity & Safeguards

| Threat | Description | Mitigation Strategy |
| :--- | :--- | :--- |
| **Fabrication Bias** | Reporting non-existent cost or simulated metrics as real. | Zero-fabrication enforcement: costs report as `null` unless genuine telemetry is provided. |
| **Small Sample Variance** | Drawing broad conclusions from few runs. | P95 latency is suppressed when $N < 20$. Repetition counts are preserved and reported. |
| **Stochastic Non-Determinism** | Agent variations clouding policy evaluation. | Seeded MockAgent plans provide completely deterministic baselines across all policies. |
| **Data Leakage** | Agent guessing outputs without tool results. | Tools return structured output schemas; intermediate traces are strictly checked before final answers. |
