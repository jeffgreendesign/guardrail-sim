# @guardrail-sim/mcp-server

[![npm version](https://img.shields.io/npm/v/@guardrail-sim/mcp-server)](https://www.npmjs.com/package/@guardrail-sim/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

MCP server that exposes pricing policy tools to AI agents. Run it, point your MCP client at it, and your agent can evaluate discounts, check policy rules, and simulate checkouts.

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

| Tool                         | What it does                                        |
| ---------------------------- | --------------------------------------------------- |
| `evaluate_policy`            | Check a proposed discount against the active policy |
| `get_policy_summary`         | Return all policy rules in plain English            |
| `get_max_discount`           | Find the best discount available for a given order  |
| `validate_discount_code`     | Validate a code and return UCP-standard error codes |
| `simulate_checkout_discount` | Run a full UCP checkout with discounts applied      |

## Programmatic Usage

```typescript
import { createServer } from '@guardrail-sim/mcp-server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = createServer();
await server.connect(new StdioServerTransport());
```

## Docs

- [MCP Tools Reference](https://github.com/jeffgreendesign/guardrail-sim/blob/main/docs/mcp-tools.mdx)
- [Architecture](https://github.com/jeffgreendesign/guardrail-sim/blob/main/docs/architecture.mdx)

## License

MIT
