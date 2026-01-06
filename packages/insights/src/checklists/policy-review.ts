import type { Checklist, ChecklistItem } from '../types.js';

/**
 * Policy Review Checklist
 *
 * A checklist for periodic review of existing pricing policies,
 * ensuring they remain effective and aligned with business goals.
 */

const marginAlignmentItem: ChecklistItem = {
  id: 'review-001',
  title: 'Verify margin floor alignment with costs',
  description: 'Confirm your margin floor still reflects current cost structure.',
  category: 'margin-protection',
  required: true,
  guidance: `
## Cost structure review

Costs change over time. Your margin floor should track them.

### Review triggers:

- Supplier price changes
- Shipping cost updates
- New overhead allocations
- Currency fluctuations
- Operational efficiency changes

### Questions to ask:

1. Has COGS changed since floor was set?
2. Are fulfillment costs still accurate?
3. Have overhead allocations been updated?
4. Is the buffer still appropriate?

### Action items:

- [ ] Pull current cost data
- [ ] Recalculate minimum margin needed
- [ ] Compare to current floor setting
- [ ] Adjust if difference > 2%
  `,
  estimatedTime: '30 minutes',
};

const competitiveAnalysisItem: ChecklistItem = {
  id: 'review-002',
  title: 'Assess competitive positioning',
  description: 'Review discount limits against market expectations.',
  category: 'margin-protection',
  required: false,
  guidance: `
## Market alignment review

Your policy should balance margin protection with competitiveness.

### Data to gather:

- Win/loss analysis on recent deals
- Feedback from sales team
- Competitor pricing intelligence
- Industry benchmark reports

### Warning signs:

- Increasing loss rate on deals
- Sales team complaints about restrictions
- Customers mentioning competitor offers
- Declining volume despite demand

### Warning signs of being too generous:

- Very high approval rates (>95%)
- Margins consistently at floor
- Sales team rarely negotiates
- Easy wins on all deals

### Adjustment considerations:

If too restrictive → Consider segment-specific relaxation
If too generous → Tighten limits or add conditions
  `,
  estimatedTime: '45 minutes',
};

const volumeThresholdReviewItem: ChecklistItem = {
  id: 'review-003',
  title: 'Review volume tier thresholds',
  description: 'Analyze order patterns to optimize quantity breakpoints.',
  category: 'volume-tiering',
  required: false,
  guidance: `
## Volume tier optimization

Tier thresholds should encourage larger orders without giving away margin.

### Data analysis:

1. Pull order quantity distribution (last 6 months)
2. Identify natural clustering points
3. Calculate margin impact at each tier

### Optimization strategies:

**If orders cluster below first tier:**
- Lower threshold to capture more volume deals
- Consider a "starter" tier

**If tiers are rarely reached:**
- Thresholds may be too high
- Or sales team doesn't communicate tiers well

**If everyone gets top tier:**
- Raise thresholds
- Add a new super-tier

### Balanced tier design:

| Tier | Target % of Orders |
|------|-------------------|
| Base | 40-50% |
| Tier 2 | 30-35% |
| Tier 3 | 15-20% |
| Tier 4 | 5-10% |
  `,
  estimatedTime: '30 minutes',
};

const segmentEffectivenessItem: ChecklistItem = {
  id: 'review-004',
  title: 'Evaluate segment rule effectiveness',
  description: 'Assess whether customer segment differentiation adds value.',
  category: 'customer-segmentation',
  required: false,
  guidance: `
## Segment effectiveness review

Segment rules add complexity. Make sure they earn their keep.

### Questions to answer:

1. Do segments actually behave differently?
2. Are segment transitions incentivizing growth?
3. Is segment assignment accurate and current?
4. Are segment limits appropriate?

### Analysis approach:

For each segment, compare:
- Average discount requested
- Average discount approved
- Approval rate
- Average margin
- Order frequency

### Red flags:

- All segments have similar approval rates
- Segment rules never trigger (redundant)
- High-value customers in low tiers
- Tier limits not differentiated enough

### Simplification opportunity:

If segments don't show meaningful differences,
consider removing segment rules to reduce complexity.
  `,
  estimatedTime: '45 minutes',
};

const rulePerformanceItem: ChecklistItem = {
  id: 'review-005',
  title: 'Analyze rule trigger patterns',
  description: 'Review which rules are actually affecting decisions.',
  category: 'simulation-analysis',
  required: true,
  guidance: `
## Rule effectiveness analysis

Not all rules are equally useful. Identify which matter.

### Metrics to review:

For each rule:
- Trigger frequency
- As % of rejections
- As limiting factor (for approvals)
- Edge case value

### Action matrix:

| Trigger Rate | Limiting Factor | Action |
|--------------|-----------------|--------|
| High | Often | Keep as-is (core rule) |
| High | Never | Review threshold |
| Low | Often | Effective backstop |
| Low | Never | Consider removing |
| Zero | Zero | Test or remove |

### Rule hygiene:

- Remove rules that never trigger AND aren't edge case protection
- Combine overlapping rules
- Ensure priorities are still correct
- Update documentation
  `,
  estimatedTime: '30 minutes',
};

const simulationValidationItem: ChecklistItem = {
  id: 'review-006',
  title: 'Run validation simulation',
  description: 'Test current policy with updated simulation parameters.',
  category: 'simulation-analysis',
  required: true,
  guidance: `
## Validation simulation

Regular simulation validates policy behavior.

### Simulation checklist:

- [ ] Update order value distributions (match recent actuals)
- [ ] Update quantity distributions
- [ ] Update segment distribution
- [ ] Run with 500+ orders
- [ ] Compare results to previous baseline

### Key comparisons:

| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|
| Approval rate | | | |
| Avg discount | | | |
| Avg margin | | | |
| Margin floor hits | | | |

### Drift detection:

If results differ significantly from expectations:

1. Review what changed
2. Determine if policy change needed
3. Or if business environment shifted
4. Document findings
  `,
  estimatedTime: '20 minutes',
};

const complianceAuditItem: ChecklistItem = {
  id: 'review-007',
  title: 'Compliance and audit check',
  description: 'Ensure policy meets regulatory and internal audit requirements.',
  category: 'compliance',
  required: true,
  guidance: `
## Compliance review

Pricing policies may have legal and regulatory implications.

### Areas to review:

**Antitrust considerations:**
- No geographic price discrimination (unless justified)
- No customer discrimination without legitimate basis
- Volume discounts must reflect actual cost savings

**Contract alignment:**
- Customer agreements honored
- Published pricing matched
- Special terms documented

**Internal controls:**
- Approval limits appropriate
- Override tracking in place
- Audit trail maintained

### Documentation requirements:

- Policy version history
- Change authorization records
- Exception approvals
- Regular review attestation

### Sign-off:

- [ ] Legal review (if applicable)
- [ ] Finance approval
- [ ] Sales leadership acknowledgment
  `,
  estimatedTime: '30 minutes',
};

const documentationUpdateItem: ChecklistItem = {
  id: 'review-008',
  title: 'Update documentation',
  description: 'Refresh policy documentation to reflect current state.',
  category: 'compliance',
  required: false,
  guidance: `
## Documentation refresh

Keep documentation current to maintain institutional knowledge.

### Update checklist:

- [ ] Policy description accurate
- [ ] All rules documented
- [ ] Thresholds and rationale current
- [ ] Owner contacts valid
- [ ] Review date set for next cycle

### Version management:

1. Update version number
2. Add changelog entry
3. Archive previous version
4. Notify stakeholders of changes

### Communication:

If significant changes made:
- Notify sales team
- Update training materials
- Brief customer success team
  `,
  estimatedTime: '20 minutes',
};

export const policyReviewChecklist: Checklist = {
  id: 'policy-review',
  name: 'Policy Review Checklist',
  description:
    'Quarterly review checklist to ensure pricing policies remain effective and aligned with business objectives.',
  context: 'report',
  items: [
    marginAlignmentItem,
    rulePerformanceItem,
    simulationValidationItem,
    volumeThresholdReviewItem,
    segmentEffectivenessItem,
    competitiveAnalysisItem,
    complianceAuditItem,
    documentationUpdateItem,
  ],
  tags: ['review', 'audit', 'quarterly', 'b2b'],
};
