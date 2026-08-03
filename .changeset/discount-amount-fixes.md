---
'@guardrail-sim/mcp-server': major
'@guardrail-sim/ucp-types': major
'@guardrail-sim/policy-engine': patch
'@guardrail-sim/insights': patch
'@guardrail-sim/simulation': patch
---

Fix two compounding discount bugs found in review.

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
