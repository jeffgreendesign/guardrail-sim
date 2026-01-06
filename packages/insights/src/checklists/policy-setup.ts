import type { Checklist, ChecklistItem, CheckContext } from '../types.js';

/**
 * Policy Setup Checklist
 *
 * A comprehensive checklist for setting up a new pricing policy,
 * covering all essential constraints for B2B commerce.
 */

const marginFloorItem: ChecklistItem = {
  id: 'setup-001',
  title: 'Configure margin floor',
  description: 'Set a minimum acceptable margin percentage to protect profitability.',
  category: 'policy-health',
  required: true,
  isComplete: (ctx: CheckContext) => ctx.policy?.hasMarginFloor ?? false,
  guidance: `
## Setting your margin floor

The margin floor is your last line of defense against unprofitable deals.

### How to determine your floor:

1. **Know your costs**: Include COGS, fulfillment, overhead allocation
2. **Add buffer**: Account for cost variability (typically 2-5%)
3. **Set minimum**: Your floor should ensure every sale contributes to profit

### Typical ranges by industry:

| Industry | Typical Floor |
|----------|---------------|
| B2B Wholesale | 10-15% |
| Manufacturing | 15-25% |
| Distribution | 8-12% |
| Professional Services | 25-40% |

### Implementation:

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
    "params": { "message": "Margin below 15% floor" }
  },
  "priority": 10
}
\`\`\`
  `,
  estimatedTime: '5 minutes',
};

const maxDiscountItem: ChecklistItem = {
  id: 'setup-002',
  title: 'Set maximum discount cap',
  description: 'Define an absolute ceiling on discounts regardless of other factors.',
  category: 'policy-health',
  required: true,
  isComplete: (ctx: CheckContext) => ctx.policy?.hasMaxDiscountCap ?? false,
  guidance: `
## Setting your maximum discount

Even with other safeguards, a hard cap prevents extreme discounts.

### Why you need this:

- **Perception**: Very high discounts can devalue your product
- **Safety net**: Catches edge cases in margin calculations
- **Simplicity**: Easy to communicate ("we never discount more than X%")

### Typical caps:

| Scenario | Typical Max |
|----------|-------------|
| Standard B2B | 25% |
| Volume deals | 30% |
| Strategic accounts | 35% |
| Clearance | 50% |

### Tip:

Set the cap slightly above your highest volume tier to allow flexibility,
but low enough to be meaningful.
  `,
  estimatedTime: '3 minutes',
};

const volumeTieringItem: ChecklistItem = {
  id: 'setup-003',
  title: 'Configure volume-based tiers',
  description: 'Set quantity thresholds that unlock higher discount limits.',
  category: 'volume-tiering',
  required: false,
  isComplete: (ctx: CheckContext) => ctx.policy?.hasVolumeTiers ?? false,
  guidance: `
## Volume-based discounting

Incentivize larger orders by offering better rates at higher quantities.

### Designing your tiers:

1. **Analyze order distribution**: Where do most orders fall?
2. **Set achievable thresholds**: First tier should be reachable
3. **Meaningful steps**: Each tier should feel like an upgrade
4. **Align with costs**: Higher volumes should have lower per-unit costs

### Example tier structure:

| Quantity | Max Discount | Rationale |
|----------|--------------|-----------|
| 1-99 | 10% | Standard pricing |
| 100-499 | 15% | Bulk efficiency |
| 500-999 | 20% | Pallet quantities |
| 1000+ | 25% | Truckload economics |

### Implementation pattern:

Use nested conditions with quantity facts:

\`\`\`json
{
  "name": "volume_tier",
  "conditions": {
    "any": [
      {
        "all": [
          { "fact": "quantity", "operator": "lessThan", "value": 100 },
          { "fact": "proposed_discount", "operator": "greaterThan", "value": 0.10 }
        ]
      },
      {
        "all": [
          { "fact": "quantity", "operator": "lessThan", "value": 500 },
          { "fact": "proposed_discount", "operator": "greaterThan", "value": 0.15 }
        ]
      }
    ]
  },
  "event": { "type": "violation", "params": { "message": "Discount exceeds volume tier limit" } }
}
\`\`\`
  `,
  estimatedTime: '10 minutes',
};

const customerSegmentationItem: ChecklistItem = {
  id: 'setup-004',
  title: 'Define customer segment rules',
  description: 'Set different discount limits based on customer tier or relationship.',
  category: 'customer-segmentation',
  required: false,
  isComplete: (ctx: CheckContext) => ctx.policy?.hasSegmentRules ?? false,
  guidance: `
## Customer segmentation

Different customers deserve different treatment based on relationship value.

### Common segment models:

**By relationship tier:**
- Platinum: Strategic partners, highest volume
- Gold: Established accounts, consistent business
- Silver: Growing accounts, proving value
- Bronze: Standard accounts
- New: Trial period, limited discounts

**By contract type:**
- Enterprise: Custom agreements
- Growth: Standard terms with incentives
- Standard: Published pricing
- Trial: Restricted access

### Differentiation strategies:

| Segment | Max Discount | Other Benefits |
|---------|--------------|----------------|
| Platinum | 25% | Extended payment, priority support |
| Gold | 20% | Net 30 terms |
| Silver | 15% | Standard terms |
| Bronze | 10% | Prepay only |
| New | 5% | Limited catalog |

### Implementation tip:

Combine segment rules with volume tiers for sophisticated policies:
- Gold + 500 units → 22% max
- Silver + 1000 units → 20% max
  `,
  estimatedTime: '15 minutes',
};

const rulePrioritiesItem: ChecklistItem = {
  id: 'setup-005',
  title: 'Set rule priorities',
  description: 'Assign explicit priorities to ensure deterministic evaluation order.',
  category: 'policy-health',
  required: true,
  isComplete: (ctx: CheckContext) => {
    if (!ctx.policy) return false;
    return ctx.policy.rules.every((r) => r.priority !== undefined);
  },
  guidance: `
## Rule priority configuration

Explicit priorities ensure consistent, predictable behavior.

### Priority guidelines:

| Priority | Rule Type | Example |
|----------|-----------|---------|
| 10 | Critical safety | Margin floor |
| 8 | Hard caps | Max discount |
| 5 | Business rules | Volume tiers |
| 3 | Segment rules | Customer tier limits |
| 1 | Edge cases | Special handling |

### Why it matters:

- json-rules-engine evaluates higher priority first
- Multiple violations are caught in priority order
- Deterministic behavior aids debugging

### Best practice:

Document your priority scheme and keep it consistent across policies.
  `,
  estimatedTime: '5 minutes',
};

const testCoverageItem: ChecklistItem = {
  id: 'setup-006',
  title: 'Test with simulation',
  description: 'Run simulations to verify policy behavior before deployment.',
  category: 'simulation-analysis',
  required: true,
  guidance: `
## Simulation testing

Before deploying, validate your policy against realistic scenarios.

### Test coverage checklist:

- [ ] Standard orders (most common scenario)
- [ ] High-value orders ($10K+)
- [ ] Large quantities (volume tier boundaries)
- [ ] Each customer segment
- [ ] Edge cases (0 quantity, 100% discount request)
- [ ] Boundary conditions (exactly at thresholds)

### Recommended simulation sizes:

| Stage | Orders | Purpose |
|-------|--------|---------|
| Quick check | 100 | Sanity test |
| Development | 500 | Pattern validation |
| Pre-deploy | 1,000+ | Statistical confidence |

### What to look for:

1. Approval rate in expected range
2. Average margins acceptable
3. No rules never triggering
4. No unexpected rejection patterns
  `,
  estimatedTime: '15 minutes',
};

const documentationItem: ChecklistItem = {
  id: 'setup-007',
  title: 'Document policy rationale',
  description: 'Record the business reasoning behind each constraint.',
  category: 'compliance',
  required: false,
  guidance: `
## Policy documentation

Good documentation helps future maintainers and auditors.

### Document for each rule:

1. **Business reason**: Why does this constraint exist?
2. **Threshold rationale**: How was the value determined?
3. **Owner**: Who can approve changes?
4. **Review date**: When should this be re-evaluated?

### Example documentation:

\`\`\`markdown
## margin_floor (15%)

**Rationale**: Based on Q3 2024 cost analysis. Includes 3% buffer for
supplier cost variability.

**Owner**: Finance team (jane@company.com)

**Review**: Quarterly, aligned with cost reviews

**History**:
- 2024-01: Set to 12%
- 2024-07: Increased to 15% due to supplier cost increase
\`\`\`

### Tip:

Keep documentation with the policy JSON for version control.
  `,
  estimatedTime: '20 minutes',
};

export const policySetupChecklist: Checklist = {
  id: 'policy-setup',
  name: 'Policy Setup Checklist',
  description:
    'Complete checklist for configuring a new B2B pricing policy with all essential constraints.',
  context: 'onboarding',
  items: [
    marginFloorItem,
    maxDiscountItem,
    rulePrioritiesItem,
    volumeTieringItem,
    customerSegmentationItem,
    testCoverageItem,
    documentationItem,
  ],
  tags: ['setup', 'onboarding', 'b2b'],
};
