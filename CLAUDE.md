# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Guardrail-Sim: Policy simulation engine for AI agent pricing governance in B2B commerce.

**Positioning:** "Everyone builds the gas pedal (AI agents that sell). This is the brakes and steering — before letting an LLM negotiate discounts, simulate what happens when it gives away margin at scale."

## Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm test             # Run tests
```

Per-package commands:

```bash
pnpm --filter @guardrail-sim/policy-engine build   # Build single package
pnpm --filter @guardrail-sim/policy-engine test    # Test single package
```

MCP server:

```bash
npx guardrail-mcp              # Run MCP server
```

### Testing

Uses Node's built-in test runner with TypeScript support:

```bash
node --test --experimental-strip-types packages/policy-engine/test/*.test.ts
```

## Monorepo Structure

```
apps/
  website/             # Fumadocs documentation site + interactive playground

packages/
  policy-engine/       # json-rules-engine integration (deterministic)
  mcp-server/          # MCP server exposing 5 policy evaluation tools
  ucp-types/           # UCP type definitions for agentic commerce
  insights/            # Policy health checks and recommendations
  simulation/          # LLM buyer personas + negotiation loop runner [PLANNED]
```

## Architecture

Two-layer separation of concerns:

1. **Simulation Engine** (Node.js) — Generates synthetic orders, runs LLM buyer personas against policies [PLANNED]
2. **Policy Engine** (Deterministic) — json-rules-engine rules, exposed via MCP tools

Key principle: LLMs simulate adversarial buyers only. Pricing math is always deterministic via the rules engine.

## Key Documentation

- `docs/getting-started.mdx` — Quick start guide and setup
- `docs/architecture.mdx` — Technical decisions with rationale
- `docs/mcp-tools.mdx` — MCP implementation patterns and examples
- `docs/concepts/policies.mdx` — Policy structure and evaluation
- `docs/adr/` — Architecture Decision Records

## Stack

- pnpm monorepo, TypeScript (ES2022, NodeNext)
- json-rules-engine for policy evaluation
- @modelcontextprotocol/sdk for MCP server
- OpenAI GPT-4o-mini Batch API for simulation [PLANNED]
- Supabase (PostgreSQL) for persistence
- Next.js 15 + Fumadocs for documentation site

## Constraints

- No Shopify integration — MVP uses synthetic data only (NDA-safe, reproducible)
- No auth — single-user for MVP
- Demo-able beats perfect — this is a portfolio project

## PR Workflow

When completing work that's ready for a pull request:

1. **Always create the PR directly** using `gh pr create --title "..." --body "..."` — never just provide a `/pull/new/branch-name` link
2. **Use conventional commit format** for PR titles: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`
3. **Include in the PR body:**
   - Summary of changes (2-4 bullet points)
   - Link to related issue if applicable (e.g., `Closes #123`)
   - Test plan or verification steps
4. **After creating the PR**, provide the actual PR URL returned by `gh`

Example:

```bash
gh pr create --title "feat(policy-engine): add volume discount rules" --body "$(cat <<'EOF'
## Summary
- Add tiered volume discount calculation
- Support percentage and fixed amount discounts
- Include validation for discount bounds

Closes #42

## Test Plan
- Run `pnpm --filter @guardrail-sim/policy-engine test`
- Verify new discount scenarios in test output
EOF
)"
```
