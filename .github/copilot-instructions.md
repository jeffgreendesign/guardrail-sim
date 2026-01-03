# GitHub Copilot Instructions for Guardrail-Sim

## Project Overview

Guardrail-Sim is a policy simulation engine for AI agent pricing governance in B2B commerce. It tests AI pricing policies before deployment by simulating adversarial buyer interactions.

**Key principle:** LLMs simulate adversarial buyers only. Pricing math is always deterministic via the rules engine.

## Repository Structure

```
apps/
  dashboard/           # Next.js 14 App Router + shadcn/ui + Tailwind

packages/
  mcp-server/          # MCP server exposing evaluate_policy tool
  policy-engine/       # json-rules-engine integration (deterministic)
  simulation/          # LLM buyer personas + negotiation loop runner
```

## Tech Stack

- **Runtime:** Node.js 20+, pnpm monorepo
- **Language:** TypeScript (ES2022, NodeNext module resolution)
- **Policy Engine:** json-rules-engine
- **MCP:** @modelcontextprotocol/sdk
- **Simulation:** OpenAI GPT-4o-mini Batch API
- **Database:** Supabase (PostgreSQL)
- **Frontend:** Next.js 14, shadcn/ui, Tailwind CSS

## Code Conventions

When generating code for this project:

1. **TypeScript:** Use explicit types, avoid `any`. Prefer interfaces over types for objects.
2. **Exports:** Use named exports, not default exports.
3. **Testing:** Use Node.js built-in test runner (`node:test`), not Jest.
4. **Formatting:** Code will be formatted with Prettier (2 spaces, no semicolons configured).
5. **Imports:** Use ES module imports with `.js` extensions for local imports.

## Common Patterns

### Policy Engine Usage

```typescript
import { PolicyEngine, defaultPolicy } from '@guardrail-sim/policy-engine';

const engine = new PolicyEngine(defaultPolicy);
const result = await engine.evaluate(
  { order_value: 5000, quantity: 100, product_margin: 0.4 },
  0.12 // requested discount
);
```

### Test File Structure

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('FeatureName', () => {
  it('should do something', () => {
    assert.strictEqual(actual, expected);
  });
});
```

## Commands Reference

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm lint             # Run ESLint
pnpm typecheck        # Type check
pnpm format           # Format with Prettier
```

## Constraints

- No Shopify integration (MVP uses synthetic data)
- No authentication (single user MVP)
- Prioritize demo-ability over perfection
