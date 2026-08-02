---
'@guardrail-sim/insights': minor
---

Fix duplicate findings, unreachable checks, and rates above 100%.

- Each insight id now maps to exactly one check. `checkApprovalRate` was registered
  under both `margin-001` and `margin-002` and returned results for both, so every
  finding was emitted twice and `summary.total` double-counted. Same for
  `checkMarginFloorThreshold` under `policy-health-006`/`-007`.
- Register `sim-004` through `sim-007`. Four of the eight simulation insights were
  exported but had no check, so they could never fire.
- Frequency checks now divide per-evaluation violation counts by an evaluation count
  rather than the order count, which reported impossible figures like
  "Margin floor triggered in 138.0% of evaluations (69 of 50)".
- `SimulationSummary` gains optional `totalEvaluations`, `outcomesByPersona`,
  `approvedOrderValues`, `rejectedOrderValues` and `edgeCaseCount`, plus an
  `evaluationCount()` helper for the correct denominator.
- `ChecklistItem` gains a `manual` flag. The `policy-review` and `pre-deployment`
  checklists defined no `isComplete` handlers and so always reported 0% complete;
  they now score the items that can be verified and surface the rest as
  `manualItems` instead of counting them as permanently incomplete.
- `VERSION` reported `0.1.0` against a `0.2.1` package.
