# Guardrail-Sim

[![CI](https://github.com/jeffgreendesign/guardrail-sim/actions/workflows/ci.yml/badge.svg)](https://github.com/jeffgreendesign/guardrail-sim/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/jeffgreendesign/guardrail-sim?devcontainer_path=.devcontainer%2Fdevcontainer.json)

**Test your AI pricing policies before they cost you millions.**

Everyone's building the gas pedal—AI agents that negotiate, discount, and close deals. But what happens when your LLM gives away margin at scale? Guardrail-Sim is the brakes and steering.

## The Problem

You're deploying an AI sales agent. It can negotiate discounts. But:

- **Will it honor your margin floors?** Or give 40% off to anyone who asks nicely?
- **How does it behave at scale?** One bad discount is a rounding error. 10,000 is a crisis.
- **Can you prove compliance?** When finance asks, "what are the rules?", show them—don't guess.

## The Solution

Guardrail-Sim lets you **simulate thousands of adversarial buyer interactions** against your pricing policies before going live. Define rules. Spawn LLM buyer personas that try to game them. See what breaks.

```
Define Policy → Simulate Attacks → Fix Gaps → Deploy with Confidence
```

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

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development setup instructions
- How to run tests locally
- Pull request guidelines

## License

MIT
