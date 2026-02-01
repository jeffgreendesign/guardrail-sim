# @guardrail-sim/policy-engine

[![npm version](https://img.shields.io/npm/v/@guardrail-sim/policy-engine)](https://www.npmjs.com/package/@guardrail-sim/policy-engine)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Rules engine for B2B pricing policies. Define margin floors, discount caps, and volume tiers — evaluate orders against them deterministically.

Built on [json-rules-engine](https://github.com/CacheControl/json-rules-engine). Part of [guardrail-sim](https://github.com/jeffgreendesign/guardrail-sim).

## Install

```bash
npm install @guardrail-sim/policy-engine
```

## Quick Start

```typescript
import { PolicyEngine, defaultPolicy } from '@guardrail-sim/policy-engine';

const engine = new PolicyEngine(defaultPolicy);

const result = await engine.evaluate(
  { order_value: 5000, quantity: 100, product_margin: 0.4 },
  0.12 // 12% proposed discount
);

result.approved; // true
result.violations; // [] — no violations
result.calculated_margin; // 0.28
```

The default policy ships with three rules: 15% margin floor, 25% discount cap, and volume-based tiers (10% base, 15% for 100+ units).

## API

- **`PolicyEngine(policy)`** — create an engine from a policy definition
- **`engine.evaluate(order, discount)`** — check a proposed discount against the rules
- **`calculateMaxDiscount(order)`** — find the highest discount an order can receive
- **`calculateAllocations(amount, lineItems, method)`** — split a discount across line items
- **`defaultPolicy`** — the built-in policy (good for testing and demos)

## Docs

- [Getting Started](https://github.com/jeffgreendesign/guardrail-sim/blob/main/docs/getting-started.mdx)
- [Policy Concepts](https://github.com/jeffgreendesign/guardrail-sim/blob/main/docs/concepts/policies.mdx)

## License

MIT
