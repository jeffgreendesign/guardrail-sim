import type { Checklist, ChecklistItem } from '../types.js';

/**
 * Pre-Deployment Checklist
 *
 * A checklist for validating policies before deploying them
 * to production AI agent systems.
 */

const validationTestingItem: ChecklistItem = {
  id: 'deploy-001',
  title: 'Run comprehensive simulation',
  description: 'Execute a full simulation with 1,000+ orders across all scenarios.',
  category: 'simulation-analysis',
  required: true,
  guidance: `
## Pre-deployment simulation

Before going live, run a comprehensive simulation.

### Simulation requirements:

- [ ] Minimum 1,000 orders
- [ ] All customer segments represented
- [ ] Full range of order values
- [ ] Volume tier boundaries tested
- [ ] Edge cases included

### Success criteria:

| Metric | Minimum | Target |
|--------|---------|--------|
| Approval rate | 40% | 60-80% |
| Avg margin | Above floor | Floor + 5%+ |
| Rule coverage | All rules tested | All rules trigger |
| No errors | 0 errors | 0 errors |

### Documentation:

Save simulation results for:
- Baseline comparison
- Audit trail
- Rollback decisions
  `,
  estimatedTime: '15 minutes',
};

const edgeCaseTestingItem: ChecklistItem = {
  id: 'deploy-002',
  title: 'Test edge cases manually',
  description: 'Verify behavior at boundary conditions and unusual inputs.',
  category: 'simulation-analysis',
  required: true,
  guidance: `
## Edge case testing

Automated simulations may miss edge cases. Test these manually.

### Critical test cases:

**Boundary values:**
- [ ] Discount at exactly max limit (e.g., 25.0%)
- [ ] Discount just over limit (e.g., 25.01%)
- [ ] Quantity exactly at tier boundary (e.g., 100)
- [ ] Margin exactly at floor (e.g., 15.0%)

**Extreme values:**
- [ ] Very high discount request (90%)
- [ ] Zero quantity order
- [ ] $1 order value
- [ ] $1,000,000 order value
- [ ] Negative values (should error gracefully)

**Missing data:**
- [ ] No customer segment
- [ ] Missing product margin
- [ ] Undefined values

### Expected behavior:

Each edge case should either:
1. Evaluate correctly with clear result
2. Return a meaningful error message

Document any unexpected behaviors.
  `,
  estimatedTime: '20 minutes',
};

const rollbackPlanItem: ChecklistItem = {
  id: 'deploy-003',
  title: 'Prepare rollback plan',
  description: 'Document how to revert to the previous policy if issues arise.',
  category: 'compliance',
  required: true,
  guidance: `
## Rollback preparation

Things can go wrong. Be ready.

### Rollback checklist:

- [ ] Previous policy version saved
- [ ] Rollback procedure documented
- [ ] Rollback tested in staging
- [ ] Contact list for escalation
- [ ] Monitoring alerts configured

### Rollback triggers:

Define when to rollback:
- Error rate exceeds X%
- Approval rate drops below Y%
- Customer complaints spike
- Revenue impact exceeds $Z

### Rollback procedure:

1. Who can trigger rollback?
2. How is rollback executed?
3. Who needs to be notified?
4. What's the verification process?
5. When is rollback complete?

### Rollback timeline:

| Severity | Response Time | Decision Maker |
|----------|---------------|----------------|
| Critical | < 15 min | On-call engineer |
| High | < 1 hour | Team lead |
| Medium | < 4 hours | Product owner |
  `,
  estimatedTime: '15 minutes',
};

const stakeholderNotificationItem: ChecklistItem = {
  id: 'deploy-004',
  title: 'Notify stakeholders',
  description: 'Inform sales, finance, and support teams of policy changes.',
  category: 'compliance',
  required: false,
  guidance: `
## Stakeholder communication

Everyone affected should know about policy changes.

### Notification matrix:

| Stakeholder | What to Share | When |
|-------------|---------------|------|
| Sales | New limits, talking points | 1 week before |
| Finance | Margin impact projections | Before approval |
| Support | FAQ, escalation path | Day of launch |
| Leadership | Summary, KPIs to watch | Before launch |

### Communication template:

**Subject:** Pricing Policy Update - [Date]

**What's changing:**
- [Bullet list of changes]

**Why:**
- [Business rationale]

**Impact:**
- [Expected effects]

**Timeline:**
- [Deployment date and time]

**Questions:**
- [Contact person]
  `,
  estimatedTime: '30 minutes',
};

const monitoringSetupItem: ChecklistItem = {
  id: 'deploy-005',
  title: 'Configure monitoring',
  description: 'Set up dashboards and alerts to track policy performance post-deployment.',
  category: 'performance',
  required: true,
  guidance: `
## Monitoring configuration

You can't improve what you don't measure.

### Key metrics to track:

**Real-time:**
- Evaluation requests per minute
- Approval/rejection rate
- Error rate
- Latency percentiles

**Daily:**
- Total evaluations
- Average discount approved
- Average margin after discount
- Rule trigger frequency
- Limiting factor distribution

### Alert thresholds:

| Metric | Warning | Critical |
|--------|---------|----------|
| Error rate | > 1% | > 5% |
| Approval rate drop | > 10% | > 25% |
| Latency p95 | > 500ms | > 2s |
| Margin below floor | Any | Any |

### Dashboard elements:

- [ ] Request volume over time
- [ ] Approval rate trend
- [ ] Margin distribution histogram
- [ ] Top violation reasons
- [ ] Segment breakdown
  `,
  estimatedTime: '30 minutes',
};

const gradualRolloutItem: ChecklistItem = {
  id: 'deploy-006',
  title: 'Plan gradual rollout',
  description: 'Consider phased deployment to limit risk.',
  category: 'performance',
  required: false,
  guidance: `
## Gradual rollout strategy

For significant changes, don't go all-in.

### Rollout phases:

**Phase 1: Shadow mode (Day 1-3)**
- New policy evaluates alongside old
- Both results logged
- Old policy decisions used
- Compare outcomes

**Phase 2: Limited rollout (Day 4-7)**
- New policy for X% of requests
- Monitor closely
- Quick rollback if issues

**Phase 3: Full rollout (Day 8+)**
- 100% on new policy
- Continue monitoring
- Document baseline

### Selection criteria for limited rollout:

Options:
- Random percentage
- Specific customer segments
- Order value ranges
- Geographic regions

### Go/no-go checklist:

Before each phase:
- [ ] Previous phase metrics acceptable
- [ ] No customer complaints
- [ ] Error rate within bounds
- [ ] Team capacity for support
  `,
  estimatedTime: '20 minutes',
};

const documentationFinalItem: ChecklistItem = {
  id: 'deploy-007',
  title: 'Finalize documentation',
  description: 'Complete all documentation before deployment.',
  category: 'compliance',
  required: true,
  guidance: `
## Documentation finalization

Complete record for audit and maintenance.

### Required documentation:

**Policy documentation:**
- [ ] Policy name and version
- [ ] Effective date
- [ ] All rules with descriptions
- [ ] Threshold values with rationale
- [ ] Business owner sign-off

**Technical documentation:**
- [ ] API changes (if any)
- [ ] Integration requirements
- [ ] Configuration parameters
- [ ] Error handling behavior

**Process documentation:**
- [ ] Rollback procedure
- [ ] Escalation contacts
- [ ] Support runbook
- [ ] FAQ for common issues

### Approval signatures:

- [ ] Product owner
- [ ] Engineering lead
- [ ] Business stakeholder
- [ ] (If applicable) Legal/compliance
  `,
  estimatedTime: '20 minutes',
};

export const preDeploymentChecklist: Checklist = {
  id: 'pre-deployment',
  name: 'Pre-Deployment Checklist',
  description:
    'Comprehensive checklist to validate policies before deploying to production AI agent systems.',
  context: 'report',
  items: [
    validationTestingItem,
    edgeCaseTestingItem,
    rollbackPlanItem,
    monitoringSetupItem,
    gradualRolloutItem,
    stakeholderNotificationItem,
    documentationFinalItem,
  ],
  tags: ['deployment', 'production', 'validation', 'b2b'],
};
