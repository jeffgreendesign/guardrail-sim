# @guardrail-sim/ucp-types

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
