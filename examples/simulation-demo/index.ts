/**
 * Guardrail-Sim Simulation Demo
 *
 * Runs 5 adversarial buyer personas against the default pricing policy
 * and displays a formatted report with metrics, outcomes, and insights.
 *
 * Usage: pnpm demo (from repo root) or npx tsx index.ts (from this directory)
 */

import { defaultPolicy } from '@guardrail-sim/policy-engine';
import { runSimulation, defaultPersonas, toSimulationSummary } from '@guardrail-sim/simulation';
import { analyzePolicy } from '@guardrail-sim/insights';

const SEED = 42;
const ORDERS_PER_PERSONA = 10;

async function main() {
  // Run simulation
  const results = await runSimulation({
    policy: defaultPolicy,
    personas: defaultPersonas,
    ordersPerPersona: ORDERS_PER_PERSONA,
    seed: SEED,
  });

  const { metrics } = results;

  // Header
  console.log('');
  console.log('='.repeat(47));
  console.log('  GUARDRAIL-SIM \u00B7 Simulation Report');
  console.log('='.repeat(47));
  console.log('');
  console.log(`  Sessions: ${metrics.totalSessions}  |  Seed: ${SEED}`);
  console.log('');

  // Key metrics
  console.log(`  Approval Rate ${'\u00B7'.repeat(5)} ${(metrics.approvalRate * 100).toFixed(1)}%`);
  console.log(
    `  Avg Discount ${'\u00B7'.repeat(6)} ${(metrics.averageDiscountApproved * 100).toFixed(1)}%`
  );
  console.log(
    `  Avg Margin ${'\u00B7'.repeat(8)} ${(metrics.averageMarginAfterDiscount * 100).toFixed(1)}%`
  );
  console.log('');

  // Outcomes by persona
  console.log('  PERSONA OUTCOMES');
  for (const persona of defaultPersonas) {
    const outcomes = metrics.outcomesByPersona[persona.id];
    if (!outcomes) continue;
    const total = outcomes.accepted + outcomes.rejected + outcomes.abandoned;
    const name = persona.id.padEnd(20, '\u00B7');
    const accepted = String(outcomes.accepted).padStart(2);
    console.log(`  ${name} ${accepted}/${total} approved`);
  }
  console.log('');

  // Violations
  const violations = Object.entries(metrics.violationsByRule);
  if (violations.length > 0) {
    console.log('  VIOLATIONS BY RULE');
    for (const [rule, count] of violations) {
      console.log(`  ${rule.padEnd(20, '\u00B7')} ${count}`);
    }
    console.log('');
  }

  // Edge cases
  if (metrics.edgeCasesFound.length > 0) {
    console.log(`  EDGE CASES FOUND: ${metrics.edgeCasesFound.length}`);
    for (const ec of metrics.edgeCasesFound.slice(0, 5)) {
      const icon = ec.severity === 'critical' ? '!!' : ec.severity === 'warning' ? ' !' : '  ';
      console.log(`  ${icon} ${ec.description}`);
    }
    if (metrics.edgeCasesFound.length > 5) {
      console.log(`     ...and ${metrics.edgeCasesFound.length - 5} more`);
    }
    console.log('');
  }

  // Run insights analysis
  const summary = toSimulationSummary(results);
  const report = await analyzePolicy({
    policy: {
      id: defaultPolicy.id,
      name: defaultPolicy.name,
      ruleCount: defaultPolicy.rules.length,
      rules: defaultPolicy.rules.map((r) => ({
        name: r.name,
        priority: r.priority ?? 0,
        conditionCount: Object.keys(r.conditions).length,
        eventType: r.event.type,
      })),
      hasMarginFloor: true,
      hasMaxDiscountCap: true,
      hasVolumeTiers: true,
      hasSegmentRules: false,
    },
    simulationResults: summary,
  });

  const triggered = report.insights.filter((r) => r.triggered);
  if (triggered.length > 0) {
    console.log('  INSIGHTS');
    for (const insight of triggered) {
      const severity = insight.insight.severity.toUpperCase().padEnd(8);
      console.log(`  [${severity}] ${insight.insight.title}`);
      if (insight.message) {
        console.log(`             ${insight.message}`);
      }
    }
    console.log('');
  }

  console.log('-'.repeat(47));
  console.log(
    `  ${report.summary.total} insights | ${report.summary.critical} critical | ${report.summary.warning} warnings`
  );
  console.log('-'.repeat(47));
  console.log('');
}

main().catch(console.error);
