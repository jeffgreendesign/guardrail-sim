# @guardrail-sim/ucp-types

[![npm version](https://img.shields.io/npm/v/@guardrail-sim/ucp-types)](https://www.npmjs.com/package/@guardrail-sim/ucp-types)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

TypeScript types for the [Universal Commerce Protocol](https://ucp.dev) — discount requests, checkout sessions, line items, payments, and converter functions to bridge between guardrail-sim's policy engine and UCP-formatted responses.

Part of [guardrail-sim](https://github.com/jeffgreendesign/guardrail-sim).

## Install

```bash
npm install @guardrail-sim/ucp-types
```

## Usage

```typescript
import {
  buildDiscountExtensionResponse,
  fromUCPLineItems,
} from '@guardrail-sim/ucp-types/converters';
import { PolicyEngine, defaultPolicy } from '@guardrail-sim/policy-engine';

// Convert UCP line items into a policy engine order
const order = fromUCPLineItems(checkoutLineItems, { productMargin: 0.35 });

// Evaluate and build a UCP-shaped response
const engine = new PolicyEngine(defaultPolicy);
const evaluation = await engine.evaluate(order, 0.15);
const response = buildDiscountExtensionResponse(['SUMMER20'], evaluation, 1500, 'Summer Sale');
```

## Entry Points

- **`@guardrail-sim/ucp-types`** — everything re-exported from one place
- **`@guardrail-sim/ucp-types/discount`** — `DiscountRequest`, `DiscountResponse`, error codes
- **`@guardrail-sim/ucp-types/checkout`** — `CheckoutResponse`, `LineItem`, `Buyer`, payment types
- **`@guardrail-sim/ucp-types/converters`** — `buildDiscountExtensionResponse`, `fromUCPLineItems`, `toUCPErrorCode`, etc.

## Docs

- [UCP Types Reference](https://github.com/jeffgreendesign/guardrail-sim/blob/main/docs/packages/ucp-types.mdx)
- [UCP Concepts](https://github.com/jeffgreendesign/guardrail-sim/blob/main/docs/concepts/ucp.mdx)

## License

MIT
