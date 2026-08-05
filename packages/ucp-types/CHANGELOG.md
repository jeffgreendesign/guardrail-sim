# @guardrail-sim/ucp-types

## 2.0.0

### Major Changes

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

- [#100](https://github.com/jeffgreendesign/guardrail-sim/pull/100) [`fcb48b7`](https://github.com/jeffgreendesign/guardrail-sim/commit/fcb48b702364755ae3a8d1aa4af68178c4c97dd8) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - Track UCP 2026-04-08. The package previously pinned 2026-01-11, three revisions behind
  a spec now at ~99% store adoption.

  **Breaking:**
  - `UCP_SPEC_VERSION` is `'2026-04-08'`, and every capability constant moves with it.
  - `UCPCapabilityDescriptor.extends` and `UCPCapabilityDeclaration.extends` widen to
    `string | readonly string[]`. 2026-04-08 allows an extension to name several parents,
    and `DISCOUNT_EXTENSION` now extends both `dev.ucp.shopping.checkout` and
    `dev.ucp.shopping.cart`.
  - `IDENTITY_LINKING_CAPABILITY` is `dev.ucp.common.identity_linking`; it was
    `dev.ucp.identity_linking`.
  - `CART_CAPABILITY` graduates from `'draft'` to the dated revision.

  **Added:**
  - `CATALOG_CAPABILITY` (`dev.ucp.shopping.catalog`), new in this revision.
  - `SUPPORTED_UCP_VERSIONS`, the revisions this project can still read.
  - `DEFAULT_PRODUCT_MARGIN`, exported so callers can see the margin
    `fromUCPLineItems` assumes when they supply none. UCP line items carry price but
    not cost, so margin cannot be derived from a cart — it was previously an
    unexported `0.3` buried in the function body.

  **Fixed — discount sign convention.** 2026-04-08 requires discount entries in `totals[]`
  and `line_items[].totals[]` to be negative, reflecting their effect on the receipt, while
  `discounts.applied[].amount` stays positive. The checkout store never emitted a discount
  total at all, so a discounted checkout reported `total === subtotal`. Totals are now
  recomputed whenever line items or discounts change, and the discount lands as a negative
  entry that reduces the total.

### Minor Changes

- [#100](https://github.com/jeffgreendesign/guardrail-sim/pull/100) [`fcb48b7`](https://github.com/jeffgreendesign/guardrail-sim/commit/fcb48b702364755ae3a8d1aa4af68178c4c97dd8) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - Migrate the MCP server to the 2026-07-28 protocol revision on SDK v2.

  **Breaking:** the three `ui://` MCP Apps resources are removed, so `resources/list`
  returns 2 entries instead of 5. `@modelcontextprotocol/ext-apps@1.7.5` peer-depends on
  `@modelcontextprotocol/sdk ^1.29.0` with no v2-compatible release, so keeping the panels
  would have meant staying on the 2025-era protocol. They were also already broken: both
  ext-apps panels imported a bare module specifier with no import map, and the build step
  only copied the HTML, so they threw on load. See ADR 004.
  - `@modelcontextprotocol/sdk` v1 replaced by `@modelcontextprotocol/server` + `/core` 2.0.0,
    plus Zod 4 (v2 does not support Zod 3).
  - `Server` + `setRequestHandler` replaced by `McpServer` + `registerTool`/`registerResource`.
  - **Every tool now declares an `outputSchema` and returns `structuredContent`.** Previously
    no tool declared one and handlers stringified JSON into a text block, giving agents nothing
    machine-readable. The text block is still emitted so 2025-era clients keep working.
  - `serveStdio` with `legacy: 'serve'` set explicitly, so existing 2025-era clients continue
    to connect. Both eras verified over real stdio.
  - Cache hints (`ttlMs`/`cacheScope`) declared per operation, and `tools/list` is emitted in a
    deterministic order for client-side caching.
  - Unknown tools now return JSON-RPC `-32602` rather than a custom `UNKNOWN_TOOL` string,
    closing the error-code gap ADR 003 flagged.
  - Out-of-range inputs are rejected against the declared schema instead of being silently
    clamped by a handler.

  `ucp-types` gains `GUARDRAIL_UCP_PROFILE` and `serializeProfile()`. The server's
  `/.well-known/ucp` resource now serializes from those constants instead of reading a JSON
  fixture at runtime with a hand-copied inline fallback — the two had already drifted, and the
  fixture is absent from a published tarball.

- [#76](https://github.com/jeffgreendesign/guardrail-sim/pull/76) [`6bdef77`](https://github.com/jeffgreendesign/guardrail-sim/commit/6bdef777f6cb1fb201a940ff59717b206a35b249) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - Add UCP Discovery/Profile types, Cart capability types, schema version constants, and fulfillment extension namespace (P0/P1 gaps from ADR 003)

### Patch Changes

- [#76](https://github.com/jeffgreendesign/guardrail-sim/pull/76) [`6bdef77`](https://github.com/jeffgreendesign/guardrail-sim/commit/6bdef777f6cb1fb201a940ff59717b206a35b249) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - Centralize violation-to-UCP error code mapping in policy-engine, removing duplicate map from ucp-types converters

- [#100](https://github.com/jeffgreendesign/guardrail-sim/pull/100) [`fcb48b7`](https://github.com/jeffgreendesign/guardrail-sim/commit/fcb48b702364755ae3a8d1aa4af68178c4c97dd8) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - Move the toolchain to the Aug 2026 baseline: TypeScript 6.0, ESLint 10,
  typescript-eslint 8.65, c8 12, `@types/node` 24, and Node 24 LTS.

  TypeScript 7 is deliberately not adopted: `typescript-eslint@8.65.0` declares
  `typescript >=4.8.4 <6.1.0`, so installing TS 7 breaks linting entirely. 6.0.3 is the
  newest release that keeps the lint pipeline working.

  `get_policy_summary` now generates its rule descriptions and summary from the active
  policy's thresholds. It previously hardcoded the default policy's 15%/25%/100-unit
  numbers, so a custom policy was described with limits it does not have.

- [#100](https://github.com/jeffgreendesign/guardrail-sim/pull/100) [`fcb48b7`](https://github.com/jeffgreendesign/guardrail-sim/commit/fcb48b702364755ae3a8d1aa4af68178c4c97dd8) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - `toDiscountValidationResult` now honors its `code` argument and echoes it on the
  result. The parameter was accepted as `_code` and discarded, forcing callers to
  re-attach the code themselves. `DiscountValidationResult` gains an optional `code`.
- Updated dependencies [[`fcb48b7`](https://github.com/jeffgreendesign/guardrail-sim/commit/fcb48b702364755ae3a8d1aa4af68178c4c97dd8), [`6bdef77`](https://github.com/jeffgreendesign/guardrail-sim/commit/6bdef777f6cb1fb201a940ff59717b206a35b249), [`4178e8d`](https://github.com/jeffgreendesign/guardrail-sim/commit/4178e8dd7c38098d9f22a8ff02510f6e42ca0919), [`fcb48b7`](https://github.com/jeffgreendesign/guardrail-sim/commit/fcb48b702364755ae3a8d1aa4af68178c4c97dd8), [`fcb48b7`](https://github.com/jeffgreendesign/guardrail-sim/commit/fcb48b702364755ae3a8d1aa4af68178c4c97dd8)]:
  - @guardrail-sim/policy-engine@0.3.0

## 1.0.0

### Major Changes

- [#52](https://github.com/jeffgreendesign/guardrail-sim/pull/52) [`19cbae7`](https://github.com/jeffgreendesign/guardrail-sim/commit/19cbae7dbf3c0be3ba32d1cf7c34c97a24c7e65c) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - Align ucp-types with official UCP specification (January 2026)

  **Breaking Changes (ucp-types):**
  - `CheckoutResponse.totals`, `links`, and `payment` are now required fields
  - `LineItem` now uses `totals: Total[]` array instead of separate `subtotal`, `discount`, `total` fields
  - `LineItem` now requires `id` field
  - `Item.title` and `Item.price` are now required (price is integer in minor units)
  - `Buyer.phone` renamed to `phone_number` (E.164 format)
  - `Total.label` renamed to `display_text`
  - `TotalType` enum: `shipping` replaced with `fulfillment`, added `fee`

  **New Types (ucp-types):**
  - Checkout: `PostalAddress`, `Link`, `FulfillmentOption`, `PaymentHandler`, `PaymentInstrument`, `PaymentResponse`, `ItemReference`, `LineItemRequest`
  - Identity Linking: `OAuthServerMetadata`, `AuthorizationRequest`, `TokenResponse`, `ClientRegistration`, etc.
  - Order: `Order`, `OrderLineItem`, `FulfillmentExpectation`, `FulfillmentEvent`, `OrderAdjustment`, `OrderWebhookEvent`

  **Patch (mcp-server):**
  - Bump `@modelcontextprotocol/sdk` to ^1.25.3

### Patch Changes

- [`6df3dfb`](https://github.com/jeffgreendesign/guardrail-sim/commit/6df3dfbbca35e6ecdbc3a2ed1a6629b0590aee47) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - Add README.md, LICENSE, and npm metadata (homepage, bugs, engines) to all packages

- Updated dependencies [[`32aea11`](https://github.com/jeffgreendesign/guardrail-sim/commit/32aea1146b80e5b326ec70356832338c2ceb06cd), [`6df3dfb`](https://github.com/jeffgreendesign/guardrail-sim/commit/6df3dfbbca35e6ecdbc3a2ed1a6629b0590aee47)]:
  - @guardrail-sim/policy-engine@0.2.1

## Unreleased

### Major Changes

- [`19cbae7`](https://github.com/jeffgreendesign/guardrail-sim/commit/19cbae7dbf3c0be3ba32d1cf7c34c97a24c7e65c) - Align ucp-types with official UCP specification (January 2026)

  **Breaking Changes:**
  - `CheckoutResponse.totals`, `links`, and `payment` are now required fields
  - `LineItem` uses `totals: Total[]` array instead of separate `subtotal`, `discount`, `total` fields
  - `LineItem` now requires `id` field
  - `Item.title` and `Item.price` are now required (price is integer in minor units)
  - `Buyer.phone` renamed to `phone_number` (E.164 format)
  - `Total.label` renamed to `display_text`
  - `TotalType` enum: `shipping` replaced with `fulfillment`, added `fee`

  **New Types:**
  - Checkout: `PostalAddress`, `Link`, `FulfillmentOption`, `PaymentHandler`, `PaymentInstrument`, `PaymentResponse`, `ItemReference`, `LineItemRequest`
  - Identity Linking: `OAuthServerMetadata`, `AuthorizationRequest`, `TokenResponse`, `ClientRegistration`
  - Order: `Order`, `OrderLineItem`, `FulfillmentExpectation`, `FulfillmentEvent`, `OrderAdjustment`, `OrderWebhookEvent`

## 0.2.0

### Minor Changes

- [`b7083b0`](https://github.com/jeffgreendesign/guardrail-sim/commit/b7083b0d2e9f59b05cf025b9aec1d252b02e048d) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - Initial public release with policy evaluation engine, MCP server, UCP types, and insights packages

### Patch Changes

- Updated dependencies [[`b7083b0`](https://github.com/jeffgreendesign/guardrail-sim/commit/b7083b0d2e9f59b05cf025b9aec1d252b02e048d)]:
  - @guardrail-sim/policy-engine@0.2.0
