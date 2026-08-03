---
'@guardrail-sim/simulation': minor
---

Make metrics policy-aware and reachable.

- `detectEdgeCases` now reads thresholds from the policy under test. It previously
  hardcoded the default policy's numbers, so a custom policy was reported against
  boundaries it does not have.
- `SimulationMetrics` gains `totalEvaluations`, the per-round count that is the correct
  denominator for `violationsByRule` and `limitingFactors`.
- The `abandoned` session outcome is now produced: a buyer walks away once even the
  smallest discount it would accept still breaks the policy, instead of burning
  its remaining rounds on an ask that cannot be approved.
- `marginImpact` now reports revenue conceded (`order_value * finalDiscount`) rather
  than the discount rate, which is what the field name always claimed.
- `toSimulationSummary` carries through the evaluation count, per-persona outcomes,
  approved/rejected order values and edge-case count so the insight checks that need
  more than headline rates can fire.
- `runSingleSession` no longer takes a `policy` parameter; the `PolicyEngine` it is
  handed already carries the policy. **Breaking for direct callers of that function**, as is
  the `marginImpact` unit change above. Both are released as `minor` because this package is
  pre-1.0, where semver permits breaking changes in a minor bump; it will move to `major`
  bumps for breaking changes once it reaches 1.0.
- Added a `test:coverage` script; the package was omitted from the root coverage run.
