import { NextResponse } from 'next/server';

const LLMS_FULL_TXT = `# Guardrail-Sim - Complete Documentation
> Policy simulation engine for AI agent pricing governance in B2B commerce.

================================================================================
## OVERVIEW
================================================================================

Guardrail-Sim lets you simulate thousands of adversarial buyer interactions against your pricing policies before going live.

**Key Principle:** LLMs simulate adversarial buyers only. Pricing math is always deterministic via the rules engine.

**Architecture:**
- Dashboard (Next.js) — Policy editor UI, simulation results viewer
- Simulation Engine (Node.js) — Generates synthetic orders, runs LLM buyer personas
- Policy Engine (Deterministic) — json-rules-engine rules, exposed via MCP

================================================================================
## QUICK START
================================================================================

Prerequisites:
- Node.js 20+
- pnpm 9+

Installation:
\`\`\`bash
git clone https://github.com/jeffgreendesign/guardrail-sim.git
cd guardrail-sim
pnpm install
pnpm build
pnpm test
\`\`\`

Basic usage:
\`\`\`typescript
import { PolicyEngine, defaultPolicy } from '@guardrail-sim/policy-engine';

const engine = new PolicyEngine(defaultPolicy);
const result = await engine.evaluate(
  { order_value: 5000, quantity: 100, product_margin: 0.4 },
  0.12  // 12% discount
);
console.log(result.approved);  // true or false
\`\`\`

================================================================================
## POLICY ENGINE
================================================================================

The policy engine provides deterministic evaluation using json-rules-engine.

### Order Object
\`\`\`typescript
interface Order {
  order_value: number;      // Total order value in dollars
  quantity: number;         // Total units
  product_margin: number;   // Base margin as decimal (0.40 = 40%)
  customer_segment?: string; // Optional: customer tier
}
\`\`\`

### EvaluationResult
\`\`\`typescript
interface EvaluationResult {
  approved: boolean;          // Whether discount is allowed
  violations: Violation[];    // List of rule violations
  applied_rules: string[];    // Rules that were checked
  calculated_margin: number;  // Margin after discount
}

interface Violation {
  rule: string;      // Rule name
  message: string;   // Human-readable explanation
  limit?: number;    // The limit that was exceeded
}
\`\`\`

### Default Policy Rules

1. **margin_floor**: Minimum 15% margin after discount
   - Violation when: calculated_margin < 0.15

2. **max_discount**: Maximum 25% discount cap
   - Violation when: proposed_discount > 0.25

3. **volume_tier**: Quantity-based limits
   - < 100 units: max 10% discount
   - ≥ 100 units: max 15% discount

================================================================================
## MCP SERVER
================================================================================

The MCP server exposes policy evaluation to AI agents via Model Context Protocol.

### Tool: evaluate_policy

Evaluate a proposed discount against the active pricing policy.

Input:
\`\`\`json
{
  "order": {
    "order_value": 5000,
    "quantity": 100,
    "product_margin": 0.4
  },
  "proposed_discount": 0.12
}
\`\`\`

Output:
\`\`\`json
{
  "approved": true,
  "violations": [],
  "applied_rules": ["margin_floor", "max_discount", "volume_tier"],
  "calculated_margin": 0.28,
  "policy_id": "default",
  "policy_name": "Default Pricing Policy"
}
\`\`\`

### Tool: get_policy_summary

Get human-readable policy explanation. Takes no parameters.

Output:
\`\`\`json
{
  "policy_id": "default",
  "policy_name": "Default Pricing Policy",
  "rules": [
    {"name": "margin_floor", "description": "Ensures minimum margin of 15%"},
    {"name": "max_discount", "description": "Maximum discount cap of 25%"},
    {"name": "volume_tier", "description": "Orders < 100 units limited to 10%"}
  ],
  "summary": "Policy: Default Pricing Policy..."
}
\`\`\`

### Tool: get_max_discount

Calculate maximum allowed discount for an order.

Input:
\`\`\`json
{
  "order": {
    "order_value": 5000,
    "quantity": 100,
    "product_margin": 0.4
  }
}
\`\`\`

Output:
\`\`\`json
{
  "max_discount": 0.15,
  "max_discount_pct": "15.0%",
  "limiting_factor": "volume_tier",
  "details": "Volume tier (100+ units) allows up to 15% discount"
}
\`\`\`

### Resource: guardrail://policies/active

Read the active policy configuration as JSON.

================================================================================
## AGENT INTEGRATION
================================================================================

### Claude Desktop Configuration
\`\`\`json
{
  "mcpServers": {
    "guardrail-sim": {
      "command": "node",
      "args": ["./packages/mcp-server/dist/index.js"]
    }
  }
}
\`\`\`

### Cursor Rules
The repository includes .cursor/rules/guardrail-sim.mdc with:
- TypeScript patterns (imports with .js extension, node: prefix)
- Testing patterns (Node.js test runner, not Jest)
- Policy engine usage examples
- MCP server patterns
- Anti-patterns to avoid

### Best Practices for Agents

1. Always validate discounts before committing:
\`\`\`typescript
const result = await mcp.callTool({
  name: 'evaluate_policy',
  arguments: { order, proposed_discount }
});
if (result.approved) {
  await commitDiscount(order, proposed_discount);
}
\`\`\`

2. Use get_max_discount to know negotiation ceiling
3. Provide actionable feedback on rejections

================================================================================
## REPOSITORY STRUCTURE
================================================================================

\`\`\`
apps/
  dashboard/           # Next.js 14 + Fumadocs documentation

packages/
  mcp-server/          # MCP server (evaluate_policy, get_policy_summary, get_max_discount)
  policy-engine/       # json-rules-engine integration
  simulation/          # LLM buyer personas (planned)

docs/
  PRD.md              # Product requirements
  ARCHITECTURE.md     # Technical decisions (ADRs)
  MCP-PATTERNS.md     # MCP implementation patterns
  SHOPIFY-CONTEXT.md  # B2B commerce domain knowledge
\`\`\`

================================================================================
## COMMANDS
================================================================================

\`\`\`bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm lint             # Run ESLint
pnpm typecheck        # Type check
pnpm format           # Format with Prettier
\`\`\`

Per-package:
\`\`\`bash
pnpm --filter @guardrail-sim/policy-engine test
pnpm --filter @guardrail-sim/mcp-server build
\`\`\`
`;

export async function GET() {
  return new NextResponse(LLMS_FULL_TXT, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
