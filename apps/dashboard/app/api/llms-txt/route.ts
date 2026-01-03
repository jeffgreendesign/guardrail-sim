import { NextResponse } from 'next/server';

const LLMS_TXT = `# Guardrail-Sim
> Policy simulation engine for AI agent pricing governance in B2B commerce.

## Overview
Test your AI pricing policies before they cost you millions. LLMs simulate adversarial buyers, while the policy engine provides deterministic, auditable decisions.

## Quick Start
- [Getting Started](/docs/getting-started): Install and run your first simulation
- [Policy Engine](/docs/policy-engine): Understanding the rule system

## MCP Tools (Model Context Protocol)
The MCP server exposes these tools for AI agents:

- [evaluate_policy](/docs/mcp-server/evaluate-policy): Evaluate a proposed discount against the active pricing policy. Use when checking if a discount is allowed.
- [get_policy_summary](/docs/mcp-server/get-policy-summary): Get a human-readable summary of policy rules. Use to explain discount limits.
- [get_max_discount](/docs/mcp-server/get-max-discount): Calculate maximum allowed discount for an order. Use when buyer asks "what's the best you can do?"

## MCP Resources
- guardrail://policies/active: The currently active policy configuration (JSON)

## Default Policy Rules
1. **Margin Floor (15%)**: Discounts cannot reduce margin below 15%
2. **Max Discount (25%)**: No discount can exceed 25%
3. **Volume Tier**: <100 units = max 10%, ≥100 units = max 15%

## Integration
- [MCP Server](/docs/mcp-server): Full MCP integration guide
- [Agent Integration](/docs/agent-integration): Use with Claude, Cursor, Copilot

## Repository Files
- /CLAUDE.md: Project context for AI assistants
- /.cursor/rules/guardrail-sim.mdc: Detailed coding conventions
- /.github/copilot-instructions.md: GitHub Copilot context

## API Reference
- [evaluate_policy input](/docs/mcp-server/evaluate-policy#input-schema): Order object + proposed_discount
- [evaluate_policy output](/docs/mcp-server/evaluate-policy#response-fields): approved, violations, calculated_margin

## Source Code
- /packages/policy-engine: Deterministic rule evaluation (json-rules-engine)
- /packages/mcp-server: MCP server implementation
- /packages/simulation: LLM buyer persona simulation (planned)
- /apps/dashboard: Next.js documentation and playground
`;

export async function GET() {
  return new NextResponse(LLMS_TXT, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
