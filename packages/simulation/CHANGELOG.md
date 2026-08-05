# @guardrail-sim/simulation

## 0.3.0

### Minor Changes

- [#100](https://github.com/jeffgreendesign/guardrail-sim/pull/100) [`fcb48b7`](https://github.com/jeffgreendesign/guardrail-sim/commit/fcb48b702364755ae3a8d1aa4af68178c4c97dd8) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - Make metrics policy-aware and reachable.
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

### Patch Changes

- [#100](https://github.com/jeffgreendesign/guardrail-sim/pull/100) [`fcb48b7`](https://github.com/jeffgreendesign/guardrail-sim/commit/fcb48b702364755ae3a8d1aa4af68178c4c97dd8) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - Fix two compounding discount bugs found in review.

  **Discounts were 100x too large.** `fromUCPLineItems` sums line-item subtotals, which UCP
  states in minor units, so `order_value` is already cents. `simulate_checkout_discount` and
  the checkout discount path then applied a second dollars-to-cents conversion. A 10% discount
  on a 750,000-cent basket was reported as 7,500,000 rather than 75,000.
  `validate_discount_code` is unaffected — its `order` argument is documented in dollars and
  does need the conversion.

  **Every discount code carried the whole basket discount.**
  `buildDiscountExtensionResponse` emitted one `applied` entry per code, each holding the full
  amount, and the checkout totals sum those entries. N codes therefore granted N times the
  discount. The amount is now split across the codes so the sum matches the discount actually
  granted, and `computeTotals` clamps the result to the subtotal so an order total can never go
  negative regardless of how a session was priced.

  Together these produced a total of **-2,900,000** on a 100,000-cent cart with three codes.

  A related bug surfaced in review of the fix itself: the aggregate allocation breakdown was
  attached wholesale to the first applied code, so with N codes its `allocations` summed to the
  _entire_ discount while its own `amount` was only a 1/N share. Each applied entry's
  allocations are now computed from its own amount, so they always sum to that entry's amount.

  Also fixed:
  - `extractPolicyThresholds` picked the volume-tier base allowance from a flattened condition
    tree, so a policy declaring its nested `any` block before the base condition would have the
    tier ceiling reported as the base allowance — more headroom than the policy grants.
  - The MCP `shipping_address` and `buyer` schemas used invented field names. Since `z.object`
    strips unknown keys, a client sending spec-correct UCP address fields had all of them
    silently dropped. Both now mirror `PostalAddress` and `Buyer` exactly.
  - `toSimulationSummary` counted abandoned sessions as rejections, skewing the high-value
    rejection insight.
  - A `policy-review` checklist item counted a rule as triggered when its violation count was
    zero.
  - `ChecklistItem` is now a discriminated union: an item is either automated and must supply
    `isComplete`, or explicitly `manual`. Previously an item that simply forgot `isComplete`
    compiled and then scored zero forever — exactly how two checklists came to report 0%.
  - The playground's Rule Flow diagram rendered fixed 15%/25% labels; it now reads the policy.
  - `RuleFlow` matched violations against the literal rule names `margin_floor`/`max_discount`/
    `volume_tier`, so a custom policy naming its rules anything else never showed as rejected.
    New `classifyPolicyRuleNames` in `policy-engine` classifies by which fact a rule reads — the
    same routing `extractPolicyThresholds` already uses — so the two can't disagree.

- [#100](https://github.com/jeffgreendesign/guardrail-sim/pull/100) [`fcb48b7`](https://github.com/jeffgreendesign/guardrail-sim/commit/fcb48b702364755ae3a8d1aa4af68178c4c97dd8) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - Move the toolchain to the Aug 2026 baseline: TypeScript 6.0, ESLint 10,
  typescript-eslint 8.65, c8 12, `@types/node` 24, and Node 24 LTS.

  TypeScript 7 is deliberately not adopted: `typescript-eslint@8.65.0` declares
  `typescript >=4.8.4 <6.1.0`, so installing TS 7 breaks linting entirely. 6.0.3 is the
  newest release that keeps the lint pipeline working.

  `get_policy_summary` now generates its rule descriptions and summary from the active
  policy's thresholds. It previously hardcoded the default policy's 15%/25%/100-unit
  numbers, so a custom policy was described with limits it does not have.

- Updated dependencies [[`fcb48b7`](https://github.com/jeffgreendesign/guardrail-sim/commit/fcb48b702364755ae3a8d1aa4af68178c4c97dd8), [`6bdef77`](https://github.com/jeffgreendesign/guardrail-sim/commit/6bdef777f6cb1fb201a940ff59717b206a35b249), [`fcb48b7`](https://github.com/jeffgreendesign/guardrail-sim/commit/fcb48b702364755ae3a8d1aa4af68178c4c97dd8), [`4178e8d`](https://github.com/jeffgreendesign/guardrail-sim/commit/4178e8dd7c38098d9f22a8ff02510f6e42ca0919), [`fcb48b7`](https://github.com/jeffgreendesign/guardrail-sim/commit/fcb48b702364755ae3a8d1aa4af68178c4c97dd8), [`fcb48b7`](https://github.com/jeffgreendesign/guardrail-sim/commit/fcb48b702364755ae3a8d1aa4af68178c4c97dd8)]:
  - @guardrail-sim/policy-engine@0.3.0
  - @guardrail-sim/insights@0.3.0

## 0.2.1

### Patch Changes

- [`6df3dfb`](https://github.com/jeffgreendesign/guardrail-sim/commit/6df3dfbbca35e6ecdbc3a2ed1a6629b0590aee47) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - Add README.md, LICENSE, and npm metadata (homepage, bugs, engines) to all packages

- Updated dependencies [[`32aea11`](https://github.com/jeffgreendesign/guardrail-sim/commit/32aea1146b80e5b326ec70356832338c2ceb06cd), [`6df3dfb`](https://github.com/jeffgreendesign/guardrail-sim/commit/6df3dfbbca35e6ecdbc3a2ed1a6629b0590aee47)]:
  - @guardrail-sim/policy-engine@0.2.1

## Unreleased

### Minor Changes

- [`19cbae7`](https://github.com/jeffgreendesign/guardrail-sim/commit/19cbae7dbf3c0be3ba32d1cf7c34c97a24c7e65c) - Add DESIGN.md based on ARLAS research for LLM buyer persona simulation

## 0.2.0

### Minor Changes

- [`b7083b0`](https://github.com/jeffgreendesign/guardrail-sim/commit/b7083b0d2e9f59b05cf025b9aec1d252b02e048d) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - Initial public release with policy evaluation engine, MCP server, UCP types, and insights packages

### Patch Changes

- Updated dependencies [[`b7083b0`](https://github.com/jeffgreendesign/guardrail-sim/commit/b7083b0d2e9f59b05cf025b9aec1d252b02e048d)]:
  - @guardrail-sim/policy-engine@0.2.0
