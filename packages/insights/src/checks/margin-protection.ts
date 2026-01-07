import type { Insight, InsightCheck, InsightResult, CheckContext } from '../types.js';

/**
 * Margin Protection Insights
 *
 * These insights analyze simulation results and evaluation patterns
 * to identify margin erosion risks and opportunities for optimization.
 */

// ============================================================================
// INSIGHT DEFINITIONS
// ============================================================================

export const highApprovalRateInsight: Insight = {
  id: 'margin-001',
  title: 'Very high discount approval rate',
  description:
    'Over 95% of discount requests are being approved. Your policy may be too permissive.',
  severity: 'warning',
  category: 'margin-protection',
  contexts: ['simulation-complete', 'report'],
  details: `
## Analysis

A very high approval rate (>95%) suggests:

- Discount requests are consistently within policy limits
- Policy limits may be more generous than necessary
- Buyers may not be testing the boundaries

## Questions to consider

1. Is the average approved discount close to your max allowed?
2. Are you hitting your margin floor frequently?
3. Could you tighten limits without losing sales?

## Recommendation

Run simulations with more aggressive buyer personas to stress-test your policy.
Consider whether tightening thresholds would impact sales.
  `,
  action: {
    type: 'review',
    label: 'Analyze approval patterns',
  },
  tags: ['approval-rate', 'permissive', 'optimization'],
  enabledByDefault: true,
};

export const lowApprovalRateInsight: Insight = {
  id: 'margin-002',
  title: 'Low discount approval rate',
  description:
    'Less than 50% of discount requests are being approved. This may frustrate customers and sales teams.',
  severity: 'warning',
  category: 'margin-protection',
  contexts: ['simulation-complete', 'report'],
  details: `
## Analysis

A low approval rate (<50%) indicates:

- Policy limits are very restrictive
- Buyer expectations don't align with policy
- Potential sales friction

## Impact assessment

- Rejected discounts may lead to lost deals
- Sales team may bypass the system
- Customer relationships may suffer

## Recommendation

1. Review which rules are causing most rejections
2. Consider whether constraints are business-necessary
3. Evaluate if volume thresholds need adjustment
4. Discuss with sales team about deal requirements
  `,
  action: {
    type: 'review',
    label: 'Review rejection causes',
  },
  tags: ['approval-rate', 'restrictive', 'sales-impact'],
  enabledByDefault: true,
};

export const marginFloorFrequentlyHitInsight: Insight = {
  id: 'margin-003',
  title: 'Margin floor frequently triggered',
  description:
    'The margin floor rule is being hit in more than 20% of evaluations. Discounts are consistently pushing margins to the limit.',
  severity: 'warning',
  category: 'margin-protection',
  contexts: ['simulation-complete', 'report'],
  details: `
## What this means

When the margin floor is the limiting factor frequently, it indicates:

- Discount requests are aggressive relative to product margins
- Other rules (max discount, volume tier) aren't catching requests first
- You're operating at minimum acceptable profitability

## Risk factors

- Little buffer for cost increases
- Vulnerability to margin erosion if floor is lowered
- May indicate pricing pressure in market

## Recommendations

1. **Review product margins**: Can base margins be increased?
2. **Tighten other rules**: Add intermediate limits before margin floor
3. **Segment analysis**: Which customer segments hit the floor most?
4. **Volume tiers**: Do volume discounts align with cost savings?
  `,
  action: {
    type: 'review',
    label: 'Analyze margin floor triggers',
  },
  tags: ['margin-floor', 'limiting-factor', 'profitability'],
  enabledByDefault: true,
};

export const averageMarginDecliningInsight: Insight = {
  id: 'margin-004',
  title: 'Average margin trending toward floor',
  description:
    'The average margin after discounts is within 5 percentage points of your margin floor.',
  severity: 'warning',
  category: 'margin-protection',
  contexts: ['simulation-complete', 'report'],
  details: `
## Margin compression detected

When average margins cluster near your floor:

- Most approvals are at maximum allowed discount
- Little room for special cases or promotions
- Business is vulnerable to margin erosion

## Financial impact

If your margin floor is 15% and average is 17%, there's only 2% buffer.
Any cost increase or competitive pressure could push you underwater.

## Actions to consider

1. **Audit discount distribution**: Are there outliers pulling average down?
2. **Review buyer personas**: Are simulation personas realistic?
3. **Cost analysis**: Validate product margins are accurate
4. **Strategic review**: Is this margin level sustainable?
  `,
  action: {
    type: 'review',
    label: 'Review margin distribution',
  },
  tags: ['margin', 'compression', 'profitability', 'trend'],
  enabledByDefault: true,
};

export const singleRuleDominatesInsight: Insight = {
  id: 'margin-005',
  title: 'Single rule causing most violations',
  description:
    'One rule is responsible for over 70% of all violations. Other rules may be redundant.',
  severity: 'info',
  category: 'margin-protection',
  contexts: ['simulation-complete', 'report'],
  details: `
## Analysis

When one rule dominates violations:

- That rule is your effective constraint
- Other rules may never trigger
- Policy complexity may be unnecessary

## Evaluation

This isn't necessarily bad—a well-designed margin floor should catch most
issues. But consider:

1. Are other rules serving a purpose?
2. Could you simplify the policy?
3. Is the dominant rule set correctly?

## Recommendation

Review whether non-triggering rules add value (edge case protection,
documentation, future-proofing) or should be removed for simplicity.
  `,
  action: {
    type: 'review',
    label: 'Analyze rule effectiveness',
  },
  tags: ['rules', 'optimization', 'simplification'],
  enabledByDefault: true,
};

export const discountGapInsight: Insight = {
  id: 'margin-006',
  title: 'Large gap between requested and approved discounts',
  description:
    'The average requested discount is significantly higher than what gets approved. Buyer expectations may be misaligned.',
  severity: 'info',
  category: 'margin-protection',
  contexts: ['simulation-complete', 'report'],
  details: `
## Expectation gap

When buyers consistently request much more than policies allow:

- They may be testing limits (normal negotiation behavior)
- Published prices may seem inflated
- Sales materials may set wrong expectations

## Considerations

- A gap of 5-10% is normal negotiation
- A gap of 15%+ suggests systemic misalignment
- Review how prices and discounts are communicated

## Recommendations

1. Ensure pricing guidance is clear
2. Train sales teams on realistic discount ranges
3. Consider whether list prices need adjustment
  `,
  action: {
    type: 'review',
    label: 'Analyze discount patterns',
  },
  tags: ['expectations', 'negotiation', 'pricing'],
  enabledByDefault: true,
};

export const nearMissApprovalInsight: Insight = {
  id: 'margin-007',
  title: 'Many near-miss approvals detected',
  description: 'A significant number of approved discounts are within 1% of a violation threshold.',
  severity: 'info',
  category: 'margin-protection',
  contexts: ['simulation-complete', 'report'],
  details: `
## Edge case analysis

When many approvals are barely within limits:

- Buyers are effectively optimizing against your policy
- Small changes to policy could flip many decisions
- Consider if this precision is intentional

## Implications

- Policy is well-calibrated (buyers find the limits)
- Or buyers have learned to game the system
- Thresholds may need buffer zones

## Recommendation

Consider whether current thresholds include appropriate safety margins,
or if you should build in small buffers (e.g., reject at 24.5% instead of 25%).
  `,
  action: {
    type: 'adjust-threshold',
    label: 'Consider threshold buffers',
  },
  tags: ['edge-cases', 'thresholds', 'precision'],
  enabledByDefault: true,
};

// ============================================================================
// CHECK IMPLEMENTATIONS
// ============================================================================

export const checkApprovalRate: InsightCheck = (context: CheckContext): InsightResult[] => {
  if (!context.simulationResults) return [];

  const results: InsightResult[] = [];
  const { approvalRate } = context.simulationResults;

  if (approvalRate > 0.95) {
    results.push({
      insight: highApprovalRateInsight,
      triggered: true,
      data: { approvalRate },
      message: `${(approvalRate * 100).toFixed(1)}% of discount requests were approved. Consider stress-testing with more aggressive scenarios.`,
    });
  }

  if (approvalRate < 0.5) {
    results.push({
      insight: lowApprovalRateInsight,
      triggered: true,
      data: { approvalRate },
      message: `Only ${(approvalRate * 100).toFixed(1)}% of discount requests were approved. This may impact sales effectiveness.`,
    });
  }

  return results;
};

export const checkMarginFloorFrequency: InsightCheck = (
  context: CheckContext
): InsightResult | null => {
  if (!context.simulationResults) return null;

  const { violationsByRule, totalOrders } = context.simulationResults;
  if (totalOrders === 0) return null;

  const marginFloorViolations = violationsByRule['margin_floor'] ?? 0;
  const frequency = marginFloorViolations / totalOrders;

  if (frequency > 0.2) {
    return {
      insight: marginFloorFrequentlyHitInsight,
      triggered: true,
      data: {
        frequency,
        violations: marginFloorViolations,
        totalOrders,
      },
      message: `Margin floor triggered in ${(frequency * 100).toFixed(1)}% of evaluations (${marginFloorViolations} of ${totalOrders}).`,
    };
  }

  return { insight: marginFloorFrequentlyHitInsight, triggered: false };
};

export const checkAverageMarginBuffer: InsightCheck = (
  context: CheckContext
): InsightResult | null => {
  if (!context.simulationResults || !context.policy) return null;

  const { averageMarginAfterDiscount } = context.simulationResults;
  const marginFloor = context.policy.marginFloorValue ?? 0.15;
  const buffer = averageMarginAfterDiscount - marginFloor;

  if (buffer < 0.05 && buffer >= 0) {
    return {
      insight: averageMarginDecliningInsight,
      triggered: true,
      data: {
        averageMargin: averageMarginAfterDiscount,
        marginFloor,
        buffer,
      },
      message: `Average margin (${(averageMarginAfterDiscount * 100).toFixed(1)}%) is only ${(buffer * 100).toFixed(1)} points above the floor (${(marginFloor * 100).toFixed(0)}%).`,
    };
  }

  return { insight: averageMarginDecliningInsight, triggered: false };
};

export const checkSingleRuleDominance: InsightCheck = (
  context: CheckContext
): InsightResult | null => {
  if (!context.simulationResults) return null;

  const { violationsByRule } = context.simulationResults;
  const totalViolations = Object.values(violationsByRule).reduce((sum, count) => sum + count, 0);

  if (totalViolations === 0) {
    return { insight: singleRuleDominatesInsight, triggered: false };
  }

  const entries = Object.entries(violationsByRule);
  const maxEntry = entries.reduce((max, entry) => (entry[1] > max[1] ? entry : max));
  const dominanceRatio = maxEntry[1] / totalViolations;

  if (dominanceRatio > 0.7) {
    return {
      insight: singleRuleDominatesInsight,
      triggered: true,
      data: {
        dominantRule: maxEntry[0],
        violations: maxEntry[1],
        totalViolations,
        ratio: dominanceRatio,
      },
      message: `The "${maxEntry[0]}" rule caused ${(dominanceRatio * 100).toFixed(0)}% of all violations.`,
    };
  }

  return { insight: singleRuleDominatesInsight, triggered: false };
};

export const checkDiscountGap: InsightCheck = (context: CheckContext): InsightResult | null => {
  if (!context.simulationResults) return null;

  const { averageDiscountRequested, averageDiscountApproved } = context.simulationResults;
  const gap = averageDiscountRequested - averageDiscountApproved;

  if (gap > 0.15) {
    return {
      insight: discountGapInsight,
      triggered: true,
      data: {
        requested: averageDiscountRequested,
        approved: averageDiscountApproved,
        gap,
      },
      message: `Buyers requested ${(averageDiscountRequested * 100).toFixed(0)}% on average but only ${(averageDiscountApproved * 100).toFixed(0)}% was approved—a ${(gap * 100).toFixed(0)}% gap.`,
    };
  }

  return { insight: discountGapInsight, triggered: false };
};

// ============================================================================
// EXPORTS
// ============================================================================

export const marginProtectionInsights: Insight[] = [
  highApprovalRateInsight,
  lowApprovalRateInsight,
  marginFloorFrequentlyHitInsight,
  averageMarginDecliningInsight,
  singleRuleDominatesInsight,
  discountGapInsight,
  // Note: nearMissApprovalInsight requires per-evaluation data not available in SimulationSummary
  // TODO: Implement when detailed evaluation results are tracked
];

export const marginProtectionChecks: Map<string, InsightCheck> = new Map([
  ['margin-001', checkApprovalRate],
  ['margin-002', checkApprovalRate],
  ['margin-003', checkMarginFloorFrequency],
  ['margin-004', checkAverageMarginBuffer],
  ['margin-005', checkSingleRuleDominance],
  ['margin-006', checkDiscountGap],
]);
