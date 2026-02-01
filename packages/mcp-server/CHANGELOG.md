# @guardrail-sim/mcp-server

## 0.3.0

### Minor Changes

- [#59](https://github.com/jeffgreendesign/guardrail-sim/pull/59) [`32aea11`](https://github.com/jeffgreendesign/guardrail-sim/commit/32aea1146b80e5b326ec70356832338c2ceb06cd) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - Add MCP Apps UI support with interactive evaluation and policy dashboards
  - Implement MCP Apps protocol extension for interactive UI components
  - Add evaluation-result.html UI with animated margin gauges and interactive discount slider
  - Add policy-dashboard.html UI with animated rule cards and interactive max discount calculator
  - Serve UI resources via `ui://` protocol with `_meta.ui` metadata on tools

### Patch Changes

- [#59](https://github.com/jeffgreendesign/guardrail-sim/pull/59) [`32aea11`](https://github.com/jeffgreendesign/guardrail-sim/commit/32aea1146b80e5b326ec70356832338c2ceb06cd) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - Add c8 to package devDependencies for test coverage reporting

- [`6df3dfb`](https://github.com/jeffgreendesign/guardrail-sim/commit/6df3dfbbca35e6ecdbc3a2ed1a6629b0590aee47) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - Add README.md, LICENSE, and npm metadata (homepage, bugs, engines) to all packages

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

- Updated dependencies [[`32aea11`](https://github.com/jeffgreendesign/guardrail-sim/commit/32aea1146b80e5b326ec70356832338c2ceb06cd), [`6df3dfb`](https://github.com/jeffgreendesign/guardrail-sim/commit/6df3dfbbca35e6ecdbc3a2ed1a6629b0590aee47), [`19cbae7`](https://github.com/jeffgreendesign/guardrail-sim/commit/19cbae7dbf3c0be3ba32d1cf7c34c97a24c7e65c)]:
  - @guardrail-sim/policy-engine@0.2.1
  - @guardrail-sim/ucp-types@1.0.0

## Unreleased

### Minor Changes

- [`6af6bcd`](https://github.com/jeffgreendesign/guardrail-sim/commit/6af6bcd3cb4eb20510fe0adc96427ecbbb8947d2) - Add MCP Apps UI support with interactive evaluation and policy dashboards
  - Implement MCP Apps protocol extension for interactive UI components
  - Add evaluation-result.html UI with animated margin gauges, status badges, and interactive discount slider
  - Add policy-dashboard.html UI with animated rule cards, constraint bars, and interactive max discount calculator
  - Serve UI resources via `ui://` protocol with `_meta.ui` metadata on tools

### Patch Changes

- [`19cbae7`](https://github.com/jeffgreendesign/guardrail-sim/commit/19cbae7dbf3c0be3ba32d1cf7c34c97a24c7e65c) - Bump `@modelcontextprotocol/sdk` to ^1.25.3
- [`7fc424f`](https://github.com/jeffgreendesign/guardrail-sim/commit/7fc424f7319b79edbc021e3b17486b90f5238321) - Add c8 to package devDependencies

## 0.2.1

### Patch Changes

- [`4d1c837`](https://github.com/jeffgreendesign/guardrail-sim/commit/4d1c837d990b2f3e4705deb185aa1b892b8be129) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - Fix npx execution by resolving symlinks in main module check

## 0.2.0

### Minor Changes

- [`b7083b0`](https://github.com/jeffgreendesign/guardrail-sim/commit/b7083b0d2e9f59b05cf025b9aec1d252b02e048d) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - Initial public release with policy evaluation engine, MCP server, UCP types, and insights packages

### Patch Changes

- Updated dependencies [[`b7083b0`](https://github.com/jeffgreendesign/guardrail-sim/commit/b7083b0d2e9f59b05cf025b9aec1d252b02e048d)]:
  - @guardrail-sim/policy-engine@0.2.0
  - @guardrail-sim/ucp-types@0.2.0
