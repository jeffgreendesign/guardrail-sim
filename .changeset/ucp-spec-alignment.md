---
'@guardrail-sim/ucp-types': major
'@guardrail-sim/mcp-server': patch
---

Align ucp-types with official UCP specification (January 2026)

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
