# Guardrail-Sim

Policy simulation engine for AI agent pricing governance in B2B commerce.

> "Everyone builds the gas pedal (AI agents that sell). This is the brakes and steering — before letting an LLM negotiate discounts, simulate what happens when it gives away margin at scale."

## Project Status

| Component     | Status       | Description                                          |
| ------------- | ------------ | ---------------------------------------------------- |
| Policy Engine | **Complete** | Deterministic rule evaluation with json-rules-engine |
| MCP Server    | Planned      | MCP tool interface for AI agents                     |
| Simulation    | Planned      | LLM buyer personas and negotiation loops             |
| Dashboard     | Planned      | Policy editor and results viewer                     |

## Quick Start

```bash
pnpm install
pnpm build
pnpm test
```

## What Works Now

The policy engine is fully functional with tests:

```typescript
import { PolicyEngine, defaultPolicy } from '@guardrail-sim/policy-engine';

const engine = new PolicyEngine(defaultPolicy);

// Evaluate a 12% discount request
const result = await engine.evaluate(
  { order_value: 5000, quantity: 100, product_margin: 0.4 },
  0.12
);

console.log(result.approved); // true or false
console.log(result.violations); // array of policy violations
console.log(result.triggeredRules); // which rules fired
```

**Default policy rules:**

- Margin floor: 15% minimum margin
- Max discount: 25% cap
- Volume tiers: 10% base, 15% for qty >= 100

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Dashboard                         [PLANNED]
│                    (Next.js + shadcn/ui)                        │
│              Policy Editor · Simulation Results                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Simulation Engine                     [PLANNED]
│                 LLM Buyer Personas · Negotiation Loops           │
│                    (OpenAI GPT-4o-mini Batch API)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Policy Engine                      [COMPLETE]
│              json-rules-engine · Deterministic Evaluation        │
│                    Exposed via MCP Server                        │
└─────────────────────────────────────────────────────────────────┘
```

## Packages

| Package                        | Description                                             | Status       |
| ------------------------------ | ------------------------------------------------------- | ------------ |
| `@guardrail-sim/policy-engine` | Deterministic policy evaluation using json-rules-engine | **Complete** |
| `@guardrail-sim/mcp-server`    | MCP server exposing `evaluate_policy` tool              | Planned      |
| `@guardrail-sim/simulation`    | LLM buyer personas and negotiation loop runner          | Planned      |
| `apps/dashboard`               | Next.js policy editor and results viewer                | Planned      |

## Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm test             # Run tests (8 passing in policy-engine)
pnpm lint             # Run ESLint
pnpm format           # Format with Prettier
```

Per-package:

```bash
pnpm --filter @guardrail-sim/policy-engine build   # Build single package
pnpm --filter @guardrail-sim/policy-engine test    # Test single package
```

## Documentation

- [Product Requirements](docs/PRD.md) — Features, success criteria, development plan
- [Architecture Decisions](docs/ARCHITECTURE.md) — Technical decisions with rationale
- [MCP Patterns](docs/MCP-PATTERNS.md) — MCP implementation reference (for future work)
- [Shopify Context](docs/SHOPIFY-CONTEXT.md) — B2B commerce domain knowledge

## License

MIT
