import type { Insight, InsightCheck, InsightResult, CheckContext } from '../types.js';

/**
 * Policy Health Check Insights
 *
 * These insights analyze policy configuration for common issues,
 * misconfigurations, and potential problems before they impact pricing.
 */

// ============================================================================
// INSIGHT DEFINITIONS
// ============================================================================

export const noMarginFloorInsight: Insight = {
  id: 'policy-health-001',
  title: 'No margin floor configured',
  description:
    'Your policy does not include a minimum margin constraint. This could allow discounts that result in losses.',
  severity: 'critical',
  category: 'policy-health',
  contexts: ['policy-edit', 'dashboard-view', 'report'],
  details: `
## Why this matters

A margin floor is your last line of defense against unprofitable transactions.
Without it, aggressive discount requests could push margins below zero.

## Recommendation

Add a margin floor rule with a minimum threshold (typically 10-20% depending on your industry).

\`\`\`json
{
  "name": "margin_floor",
  "conditions": {
    "all": [{
      "fact": "calculated_margin",
      "operator": "lessThan",
      "value": 0.15
    }]
  },
  "event": {
    "type": "violation",
    "params": {
      "message": "Calculated margin falls below 15% floor"
    }
  }
}
\`\`\`
  `,
  action: {
    type: 'add-rule',
    label: 'Add margin floor rule',
    payload: { ruleType: 'margin_floor', suggestedValue: 0.15 },
  },
  tags: ['margin', 'critical', 'foundational'],
  enabledByDefault: true,
};

export const noMaxDiscountCapInsight: Insight = {
  id: 'policy-health-002',
  title: 'No maximum discount cap configured',
  description:
    'Your policy has no upper limit on discounts. Even with a margin floor, a hard cap provides an additional safety layer.',
  severity: 'warning',
  category: 'policy-health',
  contexts: ['policy-edit', 'dashboard-view', 'report'],
  details: `
## Why this matters

A maximum discount cap ensures no single transaction can receive an excessive discount,
regardless of margin calculations. This protects against:

- Edge cases in margin calculations
- Perception issues with customers seeing very high discounts
- Potential gaming of the system

## Recommendation

Add a maximum discount rule (typically 25-35% for B2B):

\`\`\`json
{
  "name": "max_discount",
  "conditions": {
    "all": [{
      "fact": "proposed_discount",
      "operator": "greaterThan",
      "value": 0.25
    }]
  },
  "event": {
    "type": "violation",
    "params": {
      "message": "Discount exceeds maximum allowed 25%"
    }
  }
}
\`\`\`
  `,
  action: {
    type: 'add-rule',
    label: 'Add max discount cap',
    payload: { ruleType: 'max_discount', suggestedValue: 0.25 },
  },
  tags: ['discount', 'cap', 'safety'],
  enabledByDefault: true,
};

export const tooFewRulesInsight: Insight = {
  id: 'policy-health-003',
  title: 'Policy has very few rules',
  description:
    'Your policy has fewer than 3 rules. Consider adding more constraints for comprehensive coverage.',
  severity: 'info',
  category: 'policy-health',
  contexts: ['policy-edit', 'dashboard-view'],
  details: `
## Recommended baseline rules

A well-structured B2B pricing policy typically includes:

1. **Margin floor** - Minimum acceptable margin
2. **Maximum discount cap** - Hard ceiling on discounts
3. **Volume tiering** - Quantity-based discount limits
4. **Segment rules** - Customer tier considerations

## Note

More rules aren't always better. Focus on rules that protect your key business constraints.
  `,
  action: {
    type: 'review',
    label: 'Review policy coverage',
  },
  tags: ['completeness', 'coverage'],
  enabledByDefault: true,
};

export const conflictingRulesInsight: Insight = {
  id: 'policy-health-004',
  title: 'Potential rule conflict detected',
  description: 'Some rules in your policy may conflict, leading to unexpected behavior.',
  severity: 'warning',
  category: 'policy-health',
  contexts: ['policy-edit', 'report'],
  details: `
## What this means

When rules have overlapping conditions but different outcomes, the policy
behavior can become unpredictable or order-dependent.

## How to resolve

1. Review rules with similar conditions
2. Use priority settings to establish clear precedence
3. Consider combining related rules
4. Test with edge cases in the simulator
  `,
  action: {
    type: 'review',
    label: 'Review conflicting rules',
  },
  tags: ['conflict', 'complexity'],
  enabledByDefault: true,
};

export const noPrioritySetInsight: Insight = {
  id: 'policy-health-005',
  title: 'Rule priorities not configured',
  description:
    'Your rules do not have explicit priorities set. This may lead to non-deterministic evaluation order.',
  severity: 'info',
  category: 'policy-health',
  contexts: ['policy-edit'],
  details: `
## Why priorities matter

Without explicit priorities, rule evaluation order depends on array position,
which can change unexpectedly when rules are added or modified.

## Best practices

- Set highest priority (10) for critical safety rules (margin floor)
- Use medium priority (5) for standard business rules
- Use lower priority (1) for edge case handling

\`\`\`json
{
  "name": "margin_floor",
  "priority": 10,
  ...
}
\`\`\`
  `,
  action: {
    type: 'configure',
    label: 'Set rule priorities',
  },
  tags: ['priority', 'order', 'determinism'],
  enabledByDefault: true,
};

export const highMarginFloorInsight: Insight = {
  id: 'policy-health-006',
  title: 'Margin floor may be too high',
  description:
    'Your margin floor is set above 25%. This could reject many legitimate discount requests.',
  severity: 'warning',
  category: 'policy-health',
  contexts: ['policy-edit', 'simulation-complete'],
  details: `
## Analysis

A margin floor above 25% is unusually restrictive for most B2B scenarios.
This could:

- Reject legitimate volume discounts
- Frustrate sales teams and customers
- Reduce competitiveness

## Typical ranges

- Conservative: 15-20%
- Moderate: 10-15%
- Aggressive: 5-10%

Review your cost structure and competitive landscape to find the right balance.
  `,
  action: {
    type: 'adjust-threshold',
    label: 'Review margin floor threshold',
    payload: { rule: 'margin_floor', currentlyHigh: true },
  },
  tags: ['margin', 'threshold', 'restrictive'],
  enabledByDefault: true,
};

export const lowMarginFloorInsight: Insight = {
  id: 'policy-health-007',
  title: 'Margin floor may be too low',
  description:
    'Your margin floor is set below 5%. This provides minimal protection against unprofitable deals.',
  severity: 'warning',
  category: 'policy-health',
  contexts: ['policy-edit', 'simulation-complete'],
  details: `
## Risk assessment

A margin floor below 5% means:

- Almost any discount will be approved
- Very thin buffer against cost variations
- Limited protection for profitability

## Considerations

If your margins are intentionally thin (loss leader strategy, market entry),
ensure this is a deliberate business decision, not an oversight.
  `,
  action: {
    type: 'adjust-threshold',
    label: 'Review margin floor threshold',
    payload: { rule: 'margin_floor', currentlyLow: true },
  },
  tags: ['margin', 'threshold', 'permissive'],
  enabledByDefault: true,
};

export const noVolumeConsiderationInsight: Insight = {
  id: 'policy-health-008',
  title: 'No volume-based discount rules',
  description:
    'Your policy does not consider order quantity. Volume-based tiering is standard in B2B commerce.',
  severity: 'info',
  category: 'policy-health',
  contexts: ['policy-edit', 'dashboard-view'],
  details: `
## Why volume matters

B2B buyers expect quantity discounts. Without volume-based rules:

- You may be leaving money on the table (not offering competitive volume pricing)
- Or giving away margin (allowing high discounts on small orders)

## Typical volume tier structure

| Quantity | Max Discount |
|----------|--------------|
| 1-99     | 10%          |
| 100-499  | 15%          |
| 500-999  | 20%          |
| 1000+    | 25%          |

Adjust thresholds based on your unit economics and fulfillment costs.
  `,
  action: {
    type: 'add-rule',
    label: 'Add volume tier rules',
    payload: { ruleType: 'volume_tier' },
  },
  tags: ['volume', 'tiering', 'b2b'],
  enabledByDefault: true,
};

// ============================================================================
// CHECK IMPLEMENTATIONS
// ============================================================================

export const checkNoMarginFloor: InsightCheck = (context: CheckContext): InsightResult | null => {
  if (!context.policy) return null;

  return {
    insight: noMarginFloorInsight,
    triggered: !context.policy.hasMarginFloor,
    message: context.policy.hasMarginFloor
      ? undefined
      : 'Add a margin floor rule to protect against unprofitable transactions.',
  };
};

export const checkNoMaxDiscountCap: InsightCheck = (
  context: CheckContext
): InsightResult | null => {
  if (!context.policy) return null;

  return {
    insight: noMaxDiscountCapInsight,
    triggered: !context.policy.hasMaxDiscountCap,
  };
};

export const checkTooFewRules: InsightCheck = (context: CheckContext): InsightResult | null => {
  if (!context.policy) return null;

  const minRules = 3;
  return {
    insight: tooFewRulesInsight,
    triggered: context.policy.ruleCount < minRules,
    data: {
      currentRuleCount: context.policy.ruleCount,
      recommendedMinimum: minRules,
    },
  };
};

export const checkNoPrioritySet: InsightCheck = (context: CheckContext): InsightResult | null => {
  if (!context.policy) return null;

  const rulesWithoutPriority = context.policy.rules.filter(
    (r) => r.priority === undefined || r.priority === null
  );

  return {
    insight: noPrioritySetInsight,
    triggered: rulesWithoutPriority.length > 0,
    data: {
      rulesWithoutPriority: rulesWithoutPriority.map((r) => r.name),
    },
  };
};

export const checkMarginFloorThreshold: InsightCheck = (context: CheckContext): InsightResult[] => {
  if (!context.policy || !context.policy.hasMarginFloor) return [];

  const results: InsightResult[] = [];
  const marginFloor = context.policy.marginFloorValue ?? 0;

  if (marginFloor > 0.25) {
    results.push({
      insight: highMarginFloorInsight,
      triggered: true,
      data: { currentValue: marginFloor },
      message: `Your margin floor is set to ${(marginFloor * 100).toFixed(0)}%, which may reject many legitimate discounts.`,
    });
  }

  if (marginFloor < 0.05 && marginFloor > 0) {
    results.push({
      insight: lowMarginFloorInsight,
      triggered: true,
      data: { currentValue: marginFloor },
      message: `Your margin floor is set to ${(marginFloor * 100).toFixed(0)}%, providing minimal margin protection.`,
    });
  }

  return results;
};

export const checkNoVolumeConsideration: InsightCheck = (
  context: CheckContext
): InsightResult | null => {
  if (!context.policy) return null;

  return {
    insight: noVolumeConsiderationInsight,
    triggered: !context.policy.hasVolumeTiers,
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

export const policyHealthInsights: Insight[] = [
  noMarginFloorInsight,
  noMaxDiscountCapInsight,
  tooFewRulesInsight,
  conflictingRulesInsight,
  noPrioritySetInsight,
  highMarginFloorInsight,
  lowMarginFloorInsight,
  noVolumeConsiderationInsight,
];

export const policyHealthChecks: Map<string, InsightCheck> = new Map([
  ['policy-health-001', checkNoMarginFloor],
  ['policy-health-002', checkNoMaxDiscountCap],
  ['policy-health-003', checkTooFewRules],
  // Note: policy-health-004 (conflictingRulesInsight) requires rule conflict detection
  // TODO: Implement when rule condition analysis is available
  ['policy-health-005', checkNoPrioritySet],
  // checkMarginFloorThreshold returns results for both 006 (high) and 007 (low)
  ['policy-health-006', checkMarginFloorThreshold],
  ['policy-health-007', checkMarginFloorThreshold],
  ['policy-health-008', checkNoVolumeConsideration],
]);
