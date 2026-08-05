---
'@guardrail-sim/policy-engine': minor
---

Make `calculateMaxDiscount` read the policy it is asked about.

`calculateMaxDiscount` previously ignored the policy entirely and answered from
hardcoded default-policy thresholds. Against a policy with a 30% margin floor and an
8% cap it reported `{max_discount: 0.15, limiting_factor: "volume_tier"}` — naming a
rule that policy does not contain, and offering nearly 2x the headroom the policy
actually allows.

- Add `extractPolicyThresholds(policy)` and `volumeTierLimit(tiers, quantity)`, which
  recover a policy's margin floor, discount cap and volume tiers from its rule
  conditions. This is now the single source of truth for "what does this policy allow".
- `calculateMaxDiscount(order, policy)` accepts a `Policy`; the explicit-options form
  still works for callers without a `Policy` object.
- A policy stating no recognizable limit now reports `max_discount: 0` with
  `limiting_factor: 'undetermined'` rather than guessing. An unverifiable guardrail is
  reported as no headroom, not unlimited headroom.
- `evaluate()` now treats only events of type `violation` as violations. Other event
  types are collected into a new optional `notices` field and never affect `approved`,
  so a policy can carry advisory rules.
- `applied_rules` now lists every rule the engine reached a verdict on, including those
  that did not fire. It previously duplicated the violation list.
