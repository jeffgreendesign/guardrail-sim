# GitHub Copilot Instructions for Guardrail-Sim

## Project Overview

Guardrail-Sim is a policy simulation engine for AI agent pricing governance in B2B commerce. It tests AI pricing policies before deployment by simulating adversarial buyer interactions.

**Key principle:** LLMs simulate adversarial buyers only. Pricing math is always deterministic via the rules engine.

## Repository Structure

```text
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
4. **Formatting:** Code will be formatted with Prettier.
5. **Imports:** Use `.js` extensions for local imports and `node:` prefix for built-ins.

## Import Patterns

```typescript
// ✅ Correct
import { PolicyEngine } from './engine.js';
import type { Order, Policy } from './types.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';

// ❌ Wrong
import { PolicyEngine } from './engine'; // missing .js
import { describe } from 'test'; // missing node: prefix
```

## Common Patterns

### Policy Engine Usage

```typescript
import { PolicyEngine, defaultPolicy } from '@guardrail-sim/policy-engine';
import type { Order } from '@guardrail-sim/policy-engine';

const engine = new PolicyEngine(defaultPolicy);

const order: Order = {
  order_value: 5000,
  quantity: 100,
  product_margin: 0.4, // 40% margin
  customer_segment: 'gold',
};

// proposedDiscount is a decimal (0.12 = 12%)
const result = await engine.evaluate(order, 0.12);

// Result: { approved, violations, applied_rules, calculated_margin }
```

### Test File Structure

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PolicyEngine, defaultPolicy } from '../dist/index.js';
import type { Order } from '../dist/types.js';

describe('ComponentName', () => {
  describe('methodName', () => {
    it('describes expected behavior', async () => {
      // Arrange
      const engine = new PolicyEngine(defaultPolicy);
      const order: Order = { order_value: 1000, quantity: 50, product_margin: 0.4 };

      // Act
      const result = await engine.evaluate(order, 0.08);

      // Assert
      assert.strictEqual(result.approved, true);
      assert.strictEqual(result.violations.length, 0);
    });
  });
});
```

### MCP Tool Definition

```typescript
const TOOLS = [
  {
    name: 'tool_name',
    description: `Description of what the tool does.

Use this tool when:
- Condition 1
- Condition 2`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        param: { type: 'number' as const, description: 'What this is' },
      },
      required: ['param'],
    },
  },
];
```

## Anti-Patterns to Avoid

```typescript
// ❌ LLM making pricing decisions directly
const discount = await llm.ask('What discount?');

// ✅ LLM proposes, policy engine decides
const proposed = await llm.negotiate(context);
const result = await policyEngine.evaluate(order, proposed);

// ❌ Hardcoded policy values
if (discount > 0.25) {
  reject();
}

// ✅ Use policy engine
const result = await engine.evaluate(order, discount);
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
- No authentication (single-user MVP)
- Prioritize demo-ability over perfection
