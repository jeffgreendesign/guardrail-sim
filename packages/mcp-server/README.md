# @guardrail-sim/mcp-server

[![npm version](https://img.shields.io/npm/v/@guardrail-sim/mcp-server)](https://www.npmjs.com/package/@guardrail-sim/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

MCP server that exposes pricing policy tools to AI agents. Run it, point your MCP client at it, and your agent can evaluate discounts, check policy rules, run adversarial simulations, and drive UCP checkouts.

Part of [guardrail-sim](https://github.com/jeffgreendesign/guardrail-sim).

## Quick Start

```bash
npx @guardrail-sim/mcp-server
```

Or install globally:

```bash
npm install -g @guardrail-sim/mcp-server
guardrail-mcp
```

## Tools

Twelve tools, each declaring an `outputSchema` and returning `structuredContent`.

| Tool                         | What it does                                        |
| ---------------------------- | --------------------------------------------------- |
| `evaluate_policy`            | Check a proposed discount against the active policy |
| `get_policy_summary`         | Return all policy rules in plain English            |
| `get_max_discount`           | Find the best discount available for a given order  |
| `validate_discount_code`     | Validate a code and return UCP-standard error codes |
| `simulate_checkout_discount` | Run a full UCP checkout with discounts applied      |
| `run_simulation`             | Run adversarial buyer personas, deterministically   |
| `analyze_simulation`         | Simulate, then surface policy health insights       |
| `create_checkout`            | Create a UCP checkout session                       |
| `get_checkout`               | Retrieve a checkout session by id                   |
| `update_checkout`            | Update a session and re-evaluate its discounts      |
| `complete_checkout`          | Complete a session, producing an order reference    |
| `cancel_checkout`            | Cancel a checkout session                           |

## Protocol support

Targets MCP **2026-07-28** and also serves 2025-era clients from the same registrations, so
existing MCP clients keep working. See
[ADR 004](https://github.com/jeffgreendesign/guardrail-sim/blob/main/docs/adr/004-mcp-2026-07-28-migration.mdx).

## Programmatic Usage

`serveStdio` owns protocol-era negotiation, so prefer it over wiring a transport by hand:

```typescript
import { createServer } from '@guardrail-sim/mcp-server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';

// `legacy: 'serve'` keeps 2025-era clients working alongside 2026-07-28 ones.
serveStdio(() => createServer(), { legacy: 'serve' });
```

## Docs

- [MCP Tools Reference](https://github.com/jeffgreendesign/guardrail-sim/blob/main/docs/mcp-tools.mdx)
- [Architecture](https://github.com/jeffgreendesign/guardrail-sim/blob/main/docs/architecture.mdx)

## License

MIT
