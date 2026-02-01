# @guardrail-sim/ucp-types

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
