import type { Insight, InsightCheck, InsightResult, CheckContext } from '../types.js';

/**
 * Simulation Analysis Insights
 *
 * These insights analyze simulation results to identify patterns,
 * anomalies, and optimization opportunities.
 */

// ============================================================================
// INSIGHT DEFINITIONS
// ============================================================================

export const lowSimulationCoverageInsight: Insight = {
  id: 'sim-001',
  title: 'Low simulation coverage',
  description:
    'The simulation ran fewer than 100 orders. Results may not be statistically significant.',
  severity: 'info',
  category: 'simulation-analysis',
  contexts: ['simulation-complete', 'report'],
  details: `
## Statistical significance

With fewer than 100 orders:

- Edge cases may not be tested
- Averages may not be representative
- Rare scenarios won't surface

## Recommendations

For reliable insights:

| Analysis Type | Minimum Orders |
|--------------|----------------|
| Quick check  | 100            |
| Standard     | 500            |
| Comprehensive| 1,000+         |

Run larger simulations for production policy validation.
  `,
  action: {
    type: 'configure',
    label: 'Increase simulation size',
    payload: { recommendedOrders: 500 },
  },
  tags: ['simulation', 'coverage', 'statistics'],
  enabledByDefault: true,
};

export const segmentImbalanceInsight: Insight = {
  id: 'sim-002',
  title: 'Segment distribution imbalance',
  description:
    'Customer segment distribution in simulation differs significantly from typical B2B patterns.',
  severity: 'info',
  category: 'simulation-analysis',
  contexts: ['simulation-complete', 'report'],
  details: `
## Why this matters

If simulation segments don't match your actual customer base:

- Results may not predict real-world behavior
- Policies may be optimized for wrong scenarios
- Revenue impact estimates will be off

## Typical B2B segment distribution

| Segment   | Typical Range |
|-----------|---------------|
| Platinum  | 5-10%         |
| Gold      | 15-25%        |
| Silver    | 30-40%        |
| Bronze    | 25-35%        |
| New       | 5-15%         |

## Recommendation

Configure simulation to match your actual segment distribution,
or run separate simulations per segment for targeted analysis.
  `,
  action: {
    type: 'configure',
    label: 'Adjust segment distribution',
  },
  tags: ['simulation', 'segments', 'distribution'],
  enabledByDefault: true,
};

export const unusedRulesInsight: Insight = {
  id: 'sim-003',
  title: 'Rules never triggered in simulation',
  description:
    'Some policy rules were never triggered during the simulation. They may be redundant or need different test scenarios.',
  severity: 'info',
  category: 'simulation-analysis',
  contexts: ['simulation-complete', 'report'],
  details: `
## Analysis

Rules that never trigger could mean:

1. **Redundant**: Other rules catch violations first
2. **Threshold too high**: Never reached in normal scenarios
3. **Missing test cases**: Simulation doesn't cover edge cases

## Evaluation steps

For each unused rule:

1. Is it caught by another rule first? (Check priorities)
2. What inputs would trigger it? (Design targeted tests)
3. Is it needed for edge case protection? (May be OK if rarely triggered)

## Recommendation

Design specific test scenarios for unused rules to verify they work correctly,
even if they're intended for rare edge cases.
  `,
  action: {
    type: 'review',
    label: 'Review unused rules',
  },
  tags: ['rules', 'coverage', 'testing'],
  enabledByDefault: true,
};

export const volumeTierUnderutilizedInsight: Insight = {
  id: 'sim-004',
  title: 'Volume tiers underutilized',
  description:
    'Most simulated orders fall below your lowest volume tier threshold. Volume-based discounts are rarely applicable.',
  severity: 'info',
  category: 'simulation-analysis',
  contexts: ['simulation-complete', 'report'],
  details: `
## Volume tier analysis

If most orders don't qualify for volume discounts:

- Volume incentives may not be effective
- Thresholds may be too high for your market
- Or simulation doesn't reflect actual order sizes

## Considerations

1. **Are thresholds realistic?** Review actual order quantity distribution
2. **Is this intentional?** Volume discounts as premium tier benefit
3. **Market alignment**: Compare thresholds to competitor policies

## Recommendation

Analyze your actual order data to set volume thresholds that
a meaningful percentage of orders can achieve.
  `,
  action: {
    type: 'adjust-threshold',
    label: 'Review volume thresholds',
  },
  tags: ['volume', 'tiering', 'utilization'],
  enabledByDefault: true,
};

export const segmentRulesNotTriggeringInsight: Insight = {
  id: 'sim-005',
  title: 'Segment-based rules not triggering',
  description: 'Customer segment rules exist but rarely affect evaluation outcomes.',
  severity: 'info',
  category: 'simulation-analysis',
  contexts: ['simulation-complete', 'report'],
  details: `
## Analysis

If segment rules don't impact outcomes:

- Segment-specific limits may be more permissive than base rules
- Segment conditions may not match simulation data
- Segments may need more differentiation

## B2B best practice

Different customer tiers should have meaningfully different limits:

| Segment   | Max Discount | Rationale |
|-----------|--------------|-----------|
| Platinum  | 25%          | Strategic accounts, high volume |
| Gold      | 20%          | Established relationship |
| Silver    | 15%          | Growing accounts |
| Bronze    | 10%          | Standard terms |
| New       | 5%           | Prove value first |

## Recommendation

Review whether segment differentiation in your policy is meaningful,
or if it should be simplified.
  `,
  action: {
    type: 'review',
    label: 'Review segment rules',
  },
  tags: ['segments', 'effectiveness', 'differentiation'],
  enabledByDefault: true,
};

export const consistentRejectionPatternInsight: Insight = {
  id: 'sim-006',
  title: 'Consistent rejection pattern detected',
  description:
    'Rejections cluster around specific thresholds, suggesting predictable buyer behavior.',
  severity: 'info',
  category: 'simulation-analysis',
  contexts: ['simulation-complete', 'report'],
  details: `
## Pattern analysis

Clustered rejections indicate:

- Buyers are testing known thresholds
- Policy limits are well-understood (possibly too well)
- Thresholds may be predictable

## Implications

- Buyers can optimize to just below limits
- May indicate policy information is too transparent
- Could mean AI agents have "learned" your rules

## Considerations

1. Is this a problem? Predictable policies can be fair
2. Add variation? Consider dynamic limits for high-risk scenarios
3. Review source: Are simulation personas too optimized?

This is often expected and acceptable behavior.
  `,
  action: {
    type: 'review',
    label: 'Analyze rejection clusters',
  },
  tags: ['patterns', 'predictability', 'behavior'],
  enabledByDefault: true,
};

export const highValueOrderRejectionInsight: Insight = {
  id: 'sim-007',
  title: 'High-value orders frequently rejected',
  description:
    'Orders above $10,000 have a higher rejection rate than average. Consider special handling for large deals.',
  severity: 'warning',
  category: 'simulation-analysis',
  contexts: ['simulation-complete', 'report'],
  details: `
## Large deal analysis

When high-value orders are rejected more often:

- Fixed percentage limits may not fit large deal dynamics
- Strategic accounts may need different treatment
- Sales friction on important deals

## B2B considerations

Large deals often require:

- Extended negotiation
- Custom pricing
- Relationship-based decisions
- Management approval workflows

## Recommendations

1. **Tiered thresholds**: Consider higher limits for large orders
2. **Escalation path**: Flag for human review instead of reject
3. **Strategic exceptions**: Define when AI should defer to humans
4. **Deal-size rules**: Add order_value conditions to policies
  `,
  action: {
    type: 'add-rule',
    label: 'Add large deal handling',
    payload: { ruleType: 'order_value_tier' },
  },
  tags: ['high-value', 'enterprise', 'special-handling'],
  enabledByDefault: true,
};

export const noLimitingFactorVarietyInsight: Insight = {
  id: 'sim-008',
  title: 'Limited variety in limiting factors',
  description:
    'The same constraint limits discounts in almost all cases. Your policy may be effectively single-rule.',
  severity: 'info',
  category: 'simulation-analysis',
  contexts: ['simulation-complete', 'report'],
  details: `
## Factor analysis

When one factor always limits:

- Policy may be simpler than it appears
- Other constraints may be unnecessary
- Or one rule is set very conservatively

## Common scenarios

1. **Margin floor always limits**: Product margins are thin
2. **Max discount always limits**: Cap is lower than other rules allow
3. **Volume tier always limits**: Quantities are too low for higher tiers

## Recommendation

Review if this is intentional. If one rule always limits:

- Consider removing redundant rules for simplicity
- Or adjust thresholds so multiple rules are relevant
- Document that other rules are "backstops" for edge cases
  `,
  action: {
    type: 'review',
    label: 'Analyze limiting factors',
  },
  tags: ['limiting-factor', 'simplification', 'effectiveness'],
  enabledByDefault: true,
};

// ============================================================================
// CHECK IMPLEMENTATIONS
// ============================================================================

export const checkSimulationCoverage: InsightCheck = (
  context: CheckContext
): InsightResult | null => {
  if (!context.simulationResults) return null;

  const { totalOrders } = context.simulationResults;

  if (totalOrders < 100) {
    return {
      insight: lowSimulationCoverageInsight,
      triggered: true,
      data: { totalOrders },
      message: `Simulation ran only ${totalOrders} orders. Consider running at least 100 for reliable insights.`,
    };
  }

  return { insight: lowSimulationCoverageInsight, triggered: false };
};

export const checkSegmentDistribution: InsightCheck = (
  context: CheckContext
): InsightResult | null => {
  if (!context.simulationResults?.ordersBySegment) return null;

  const { ordersBySegment, totalOrders } = context.simulationResults;
  const segments = Object.entries(ordersBySegment);

  // Guard against division by zero and check for extreme imbalances (any segment > 60% or missing segments)
  const imbalanced = totalOrders > 0 && segments.some(([_, count]) => count / totalOrders > 0.6);
  const missingSegments = ['platinum', 'gold', 'silver', 'bronze', 'new'].filter(
    (seg) => !ordersBySegment[seg] || ordersBySegment[seg] === 0
  );

  if (imbalanced || missingSegments.length > 2) {
    return {
      insight: segmentImbalanceInsight,
      triggered: true,
      data: {
        distribution: ordersBySegment,
        missingSegments,
      },
      message:
        missingSegments.length > 0
          ? `Missing segments in simulation: ${missingSegments.join(', ')}.`
          : 'Segment distribution is heavily imbalanced.',
    };
  }

  return { insight: segmentImbalanceInsight, triggered: false };
};

export const checkUnusedRules: InsightCheck = (context: CheckContext): InsightResult | null => {
  if (!context.simulationResults || !context.policy) return null;

  const { violationsByRule } = context.simulationResults;
  const policyRules = context.policy.rules.map((r) => r.name);

  const unusedRules = policyRules.filter(
    (rule) => !violationsByRule[rule] || violationsByRule[rule] === 0
  );

  if (unusedRules.length > 0) {
    return {
      insight: unusedRulesInsight,
      triggered: true,
      data: { unusedRules },
      message: `Rules never triggered: ${unusedRules.join(', ')}.`,
    };
  }

  return { insight: unusedRulesInsight, triggered: false };
};

export const checkLimitingFactorVariety: InsightCheck = (
  context: CheckContext
): InsightResult | null => {
  if (!context.simulationResults) return null;

  const { limitingFactors } = context.simulationResults;
  const total = Object.values(limitingFactors).reduce((sum, count) => sum + count, 0);

  if (total === 0) {
    return { insight: noLimitingFactorVarietyInsight, triggered: false };
  }

  const entries = Object.entries(limitingFactors);
  const dominant = entries.reduce((max, entry) => (entry[1] > max[1] ? entry : max));
  const dominanceRatio = dominant[1] / total;

  if (dominanceRatio > 0.9) {
    return {
      insight: noLimitingFactorVarietyInsight,
      triggered: true,
      data: {
        dominantFactor: dominant[0],
        ratio: dominanceRatio,
        allFactors: limitingFactors,
      },
      message: `"${dominant[0]}" is the limiting factor in ${(dominanceRatio * 100).toFixed(0)}% of evaluations.`,
    };
  }

  return { insight: noLimitingFactorVarietyInsight, triggered: false };
};

// ============================================================================
// EXPORTS
// ============================================================================

export const simulationAnalysisInsights: Insight[] = [
  lowSimulationCoverageInsight,
  segmentImbalanceInsight,
  unusedRulesInsight,
  volumeTierUnderutilizedInsight,
  segmentRulesNotTriggeringInsight,
  consistentRejectionPatternInsight,
  highValueOrderRejectionInsight,
  noLimitingFactorVarietyInsight,
];

export const simulationAnalysisChecks: Map<string, InsightCheck> = new Map([
  ['sim-001', checkSimulationCoverage],
  ['sim-002', checkSegmentDistribution],
  ['sim-003', checkUnusedRules],
  ['sim-008', checkLimitingFactorVariety],
]);
