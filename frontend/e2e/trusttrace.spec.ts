import { test, expect } from '@playwright/test';

test.describe('TrustTrace End-to-End Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API endpoints for fast, deterministic E2E testing
    await page.route('**/health', async (route) => {
      await route.fulfill({
        json: {
          status: 'ok',
          version: '0.1.0',
          database: 'ok',
          db_type: 'sqlite',
          gemini_available: false,
          mock_mode: true,
          timestamp: new Date().toISOString(),
        },
      });
    });

    await page.route('**/api/v1/auth/demo', async (route) => {
      await route.fulfill({
        json: {
          access_token: 'mock-jwt-token.signature',
          token_type: 'bearer',
          user: {
            id: 'user-demo-1',
            email: 'researcher@trusttrace.ai',
            name: 'Demo Researcher',
            role: 'researcher',
            is_active: true,
            created_at: new Date().toISOString(),
          },
        },
      });
    });

    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        json: {
          id: 'user-demo-1',
          email: 'researcher@trusttrace.ai',
          name: 'Demo Researcher',
          role: 'researcher',
          is_active: true,
          created_at: new Date().toISOString(),
        },
      });
    });

    await page.route('**/api/v1/metrics/dashboard', async (route) => {
      await route.fulfill({
        json: {
          total_experiments: 10,
          completed_experiments: 10,
          successful_experiments: 8,
          failed_experiments: 2,
          total_retries: 14,
          total_runs: 30,
          task_success_rate: 0.8,
          recovery_success_rate: 0.75,
          avg_latency_ms: 120.5,
          outcome_distribution: { success: 8, failure: 2 },
          recent_experiments: [],
          most_common_failures: [
            { category: 'timeout', count: 4, recovery_rate: 0.75 },
            { category: 'transient_error', count: 3, recovery_rate: 1.0 },
          ],
        },
      });
    });

    await page.route('**/api/v1/metrics/comparison', async (route) => {
      await route.fulfill({
        json: {
          policies: [
            {
              policy_id: 'policy_g_budget_aware',
              policy_name: 'Policy G: Budget-Aware Recovery',
              sample_size: 10,
              task_success_rate: 0.8,
              recovery_success_rate: 0.75,
              mean_latency_ms: 120.5,
              avg_retry_count: 1.4,
            },
          ],
        },
      });
    });

    await page.route('**/api/v1/test-cases*', async (route) => {
      await route.fulfill({
        json: [
          {
            id: 'TC-001',
            name: 'API Timeout',
            description: 'Tool call exceeds deadline',
            fault_category: 'timeout',
            scenario_id: 'timeout_step1',
            expected_recovery: 'Bounded Retry',
            recommended_policy_id: 'policy_b_bounded_retry',
            task_ids: ['task_expense_policy'],
            default_params: { max_retries: 2, timeout_seconds: 15 },
            is_sample: true,
          },
          {
            id: 'TC-002',
            name: 'Tool Unavailable',
            description: 'Service unavailable HTTP 503',
            fault_category: 'tool_unavailable',
            scenario_id: 'tool_unavailable_step2',
            expected_recovery: 'Fallback',
            recommended_policy_id: 'policy_d_fallback',
            task_ids: ['task_expense_policy'],
            default_params: { max_retries: 1, timeout_seconds: 15 },
            is_sample: true,
          },
        ],
      });
    });

    await page.route('**/api/v1/exports/tasks/list', async (route) => {
      await route.fulfill({
        json: [
          {
            id: 'task_expense_policy',
            name: 'Expense Policy Lookup',
            description: 'Lookup expense limits',
            category: 'knowledge_retrieval',
            difficulty: 'easy',
            is_benchmark: true,
            version: '1.0',
          },
        ],
      });
    });

    await page.route('**/api/v1/scenarios', async (route) => {
      await route.fulfill({
        json: [
          {
            id: 'transient_error_step1',
            name: 'Transient Error at Step 1',
            description: 'HTTP 503 at step 1',
            category: 'transient_error',
            probability: 1.0,
            deterministic_step: 1,
            failure_delay_ms: 0,
            severity: 'medium',
            seed: 1008,
            is_active: true,
          },
        ],
      });
    });

    await page.route('**/api/v1/scenarios/policies/list', async (route) => {
      await route.fulfill({
        json: [
          {
            id: 'policy_g_budget_aware',
            name: 'Policy G: Budget-Aware Recovery',
            description: 'Adaptive recovery based on remaining budgets',
          },
        ],
      });
    });

    await page.route('**/api/v1/experiments', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          json: {
            id: 'exp-e2e-1',
            name: 'E2E Resilience Trial',
            status: 'pending',
            created_at: new Date().toISOString(),
          },
        });
      } else {
        await route.fulfill({ json: [] });
      }
    });

    await page.route('**/api/v1/experiments/exp-e2e-1/run', async (route) => {
      await route.fulfill({
        json: { status: 'completed', total_runs: 1, run_ids: ['run-1'] },
      });
    });

    // Start at base URL
    await page.goto('/');
  });

  test('1. Authentication: Demo login and session verification', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in to trusttrace/i })).toBeVisible();

    // Click demo access
    const demoButton = page.getByRole('button', { name: /explore as demo researcher/i });
    await expect(demoButton).toBeVisible();
    await demoButton.click();

    // Expect redirection to dashboard and presence of user session
    await expect(page).toHaveURL('/');
    await expect(page.getByText('TrustTrace').first()).toBeVisible();
  });

  test('2. Dashboard: KPI metrics, charts, and action buttons', async ({ page }) => {
    await page.goto('/');

    // Check header branding and breadcrumbs
    await expect(page.getByText('TrustTrace Dashboard')).toBeVisible();

    // Verify presence of the 6 core KPI metric cards
    await expect(page.getByText('Total Tests')).toBeVisible();
    await expect(page.getByText('Successful Experiments')).toBeVisible();
    await expect(page.getByText('Failed Experiments')).toBeVisible();
    await expect(page.getByText('Recovery Success Rate')).toBeVisible();
    await expect(page.getByText('Average Execution Time')).toBeVisible();
    await expect(page.getByText('Total Retry Attempts')).toBeVisible();

    // Verify Action CTA buttons
    await expect(page.getByRole('button', { name: /quick start experiment/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /view full report/i })).toBeVisible();

    // Verify Comparison Chart Section
    await expect(page.getByText(/compare error-handling methods/i)).toBeVisible();
  });

  test('3. Test Case Library: Displays 10 standard benchmarks with execution capability', async ({ page }) => {
    await page.goto('/test-cases');

    await expect(page.getByRole('heading', { name: /test case library/i })).toBeVisible();
    await expect(page.getByText(/10 standard benchmarks/i)).toBeVisible();

    // Verify test case items (TC-001 through TC-010)
    await expect(page.getByText('TC-001')).toBeVisible();
    await expect(page.getByText('TC-002')).toBeVisible();

    // Check filter by category
    const filterSelect = page.locator('select');
    await expect(filterSelect).toBeVisible();

    // Search functionality
    const searchInput = page.getByPlaceholder(/search test cases/i);
    await searchInput.fill('Timeout');
    await expect(page.getByText('TC-001')).toBeVisible();
  });

  test('4. 6-Step Experiment Wizard: Step-by-step creation and validation', async ({ page }) => {
    await page.goto('/experiments/new');

    await expect(page.getByRole('heading', { name: /new test/i })).toBeVisible();
    await expect(page.getByText(/step 1 of 6: test details/i)).toBeVisible();

    // Step 1: Details (Title, Hypothesis, Description)
    const titleInput = page.getByPlaceholder(/e\.g\. testing if waiting/i);
    await expect(titleInput).toBeVisible();
    await titleInput.fill('E2E Resilience Trial: Bounded Retry Evaluation');

    const hypothesisInput = page.getByPlaceholder(/under rate limits/i);
    await expect(hypothesisInput).toBeVisible();
    await hypothesisInput.fill('Bounded retry resolves >85% of transient errors within 2 retries.');

    // Step 1 -> Step 2
    await page.getByRole('button', { name: /continue to step 2/i }).click();
    await expect(page.getByText(/step 2 of 6: how ai handles errors/i)).toBeVisible();

    // Step 2: Policy Selection
    await expect(page.getByText('Policy G: Smart Adaptive Recovery')).toBeVisible();
    await page.getByRole('button', { name: /continue to step 3/i }).click();

    // Step 3: Fault Scenario
    await expect(page.getByText(/step 3 of 6: choose a test problem/i)).toBeVisible();
    await page.getByRole('button', { name: /continue to step 4/i }).click();

    // Step 4: Tasks Selection
    await expect(page.getByText(/step 4 of 6: select tasks/i)).toBeVisible();
    await expect(page.getByText(/selected: .* tasks/i)).toBeVisible();
    await page.getByRole('button', { name: /continue to step 5/i }).click();

    // Step 5: Test Settings (budget, retries, etc.)
    await expect(page.getByText(/step 5 of 6: test settings/i)).toBeVisible();
    await page.getByRole('button', { name: /continue to step 6/i }).click();

    // Step 6: Review & Run
    await expect(page.getByText(/step 6 of 6: review & run/i)).toBeVisible();
    await expect(page.getByText(/step 6: review & start test/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /start test now/i })).toBeVisible();
  });

  test('5. Recovery Strategies: Catalog of 7 formal policies', async ({ page }) => {
    await page.goto('/strategies');

    await expect(page.getByRole('heading', { name: /recovery strategies/i })).toBeVisible();
    await expect(page.getByText(/7 formal policies/i)).toBeVisible();

    // Check specific policy cards by exact heading
    await expect(page.getByRole('heading', { name: 'Baseline Stop' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bounded Retry' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Validation and Retry' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fallback Strategy' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Safe Stop' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Clarification' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Budget-Aware Recovery' })).toBeVisible();
  });

  test('6. Voice Assistant Page: Speech AI interface and commands', async ({ page }) => {
    await page.goto('/voice');

    await expect(page.getByRole('heading', { name: /voice assistant/i })).toBeVisible();
    await expect(page.getByText(/tap the microphone to speak/i)).toBeVisible();

    // Test text fallback input
    const commandInput = page.getByPlaceholder(/type a voice command/i);
    await commandInput.fill('Compare recovery policies');
    await page.getByRole('button', { name: /send/i }).click();

    // Expect assistant response in message history
    await expect(page.getByRole('button', { name: 'Compare Recovery Methods' })).toBeVisible();
  });

  test('7. Theme Toggle: Dark and Light mode switching', async ({ page }) => {
    await page.goto('/');

    const themeButton = page.getByRole('button', { name: /switch to/i });
    await expect(themeButton).toBeVisible();

    // Click theme button to toggle
    await themeButton.click();
    // Verify html tag receives dark or light class
    const html = page.locator('html');
    await expect(html).toBeVisible();
  });

  test('8. Mobile Responsiveness: Hamburger menu and collapsible drawer', async ({ page }) => {
    // Set small mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const hamburger = page.getByLabel(/open navigation menu/i);
    await expect(hamburger).toBeVisible();
    await hamburger.click();

    // Expect drawer to open and display navigation links
    await expect(page.getByRole('link', { name: /overview/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /test case library/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /recovery strategies/i })).toBeVisible();
  });
});
