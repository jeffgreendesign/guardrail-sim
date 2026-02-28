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

Guardrail-Sim lets you **simulate thousands of adversarial buyer interactions** against your pricing policies before going live. Define rules. Spawn buyer personas that try to game them. See what breaks.

**Define Policy → Simulate Attacks → Fix Gaps → Deploy with Confidence**

## Try It Now

```bash
git clone https://github.com/jeffgreendesign/guardrail-sim.git
cd guardrail-sim && pnpm install && pnpm build
```

Run a simulation with 5 adversarial buyer personas:

```bash
pnpm demo
```

Expected output:

```
===============================================
  GUARDRAIL-SIM · Simulation Report
===============================================

  Sessions: 50  |  Seed: 42

  Approval Rate ····· 46.0%
  Avg Discount ······ 9.0%
  Avg Margin ········ 28.4%

  PERSONA OUTCOMES
  budget-buyer········ 10/10 approved
  strategic-buyer·····  9/10 approved
  margin-hunter·······  0/10 approved
  volume-gamer········  4/10 approved
  code-stacker········  0/10 approved
```

Or test a single policy evaluation:

```typescript
import { PolicyEngine, defaultPolicy } from '@guardrail-sim/policy-engine';

const engine = new PolicyEngine(defaultPolicy);

const result = await engine.evaluate(
  { order_value: 5000, quantity: 100, product_margin: 0.4 },
  0.12
);

console.log(result.approved); // true
console.log(result.violations); // []
```

## Project Status

| Component     | Status       | Description                                          |
| ------------- | ------------ | ---------------------------------------------------- |
| Policy Engine | **Complete** | Deterministic rule evaluation with json-rules-engine |
| MCP Server    | **Complete** | 7 MCP tools including simulation and UCP-aligned     |
| UCP Types     | **Complete** | Universal Commerce Protocol type definitions         |
| Insights      | **Complete** | Policy health checks and recommendations             |
| Simulation    | **Complete** | Adversarial buyer personas and negotiation loops     |

### Default Policy Rules

- Margin floor: 15% minimum margin
- Max discount: 25% cap
- Volume tiers: 10% base, 15% for qty >= 100

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Simulation Engine                           │
│          5 Buyer Personas · Adversarial Negotiation Loops       │
│               Deterministic (seeded PRNG)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Policy Engine                            │
│              json-rules-engine · Deterministic Evaluation       │
│                    Exposed via MCP Server (7 tools)             │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
packages/
├── policy-engine/     ✅ Deterministic rule evaluation (json-rules-engine)
├── simulation/        ✅ Adversarial buyer personas + negotiation loops
├── mcp-server/        ✅ MCP server with 7 tools (policy + simulation + UCP)
├── ucp-types/         ✅ UCP type definitions and converters
├── insights/          ✅ Policy health checks and recommendations
apps/
└── website/           ✅ Fumadocs documentation site + interactive playground
examples/
├── ucp-integration-demo/   UCP discount validation scenarios
└── simulation-demo/        Run simulation and see results
```

## Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm test             # Run tests (109 passing)
pnpm demo             # Run simulation demo
pnpm lint             # Run ESLint
pnpm format           # Format with Prettier
```

Per-package:

```bash
pnpm --filter @guardrail-sim/policy-engine build   # Build single package
pnpm --filter @guardrail-sim/policy-engine test    # Test single package
```

MCP server:

```bash
npx @guardrail-sim/mcp-server  # Run MCP server
```

## Documentation

- [Getting Started](docs/getting-started.mdx) — Quick start guide and setup
- [Architecture](docs/architecture.mdx) — Technical decisions with rationale
- [MCP Tools](docs/mcp-tools.mdx) — MCP implementation reference
- [Policy Concepts](docs/concepts/policies.mdx) — Policy structure and evaluation

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development setup instructions
- How to run tests locally
- Pull request guidelines

## License

MIT
