# Guardrail-Sim: Architecture Decision Record

**Version:** 1.0
**Created:** December 29, 2025
**Status:** Active Development
**Last Updated:** December 30, 2025

---

## Overview

This document captures the key technical decisions for Guardrail-Sim, including alternatives considered and rationale for choices made. Reference this when implementation questions arise.

---

## Decision 1: Policy Engine Library

> **Status: IMPLEMENTED** — See `packages/policy-engine/`

### Decision

Use **json-rules-engine** (Node.js) for deterministic policy evaluation.

### Alternatives Considered

| Option                    | Pros                                                                                 | Cons                                                  |
| ------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| **json-rules-engine**     | Battle-tested, active maintenance, JS-native, good docs, supports complex conditions | No built-in UI, JSON-only rules                       |
| **Drools (Java)**         | Enterprise-grade, powerful rule language                                             | JVM dependency, overkill for MVP, breaks JS ecosystem |
| **node-rules**            | Simple API                                                                           | Less active, fewer features                           |
| **Custom implementation** | Full control                                                                         | Time sink, bugs, maintenance burden                   |
| **LLM-based evaluation**  | Flexible, natural language rules                                                     | Non-deterministic, slow, expensive, unauditable       |

### Rationale

- json-rules-engine is the most popular JS rules engine (~1.5k GitHub stars)
- Supports nested conditions, priority ordering, and custom operators
- Deterministic evaluation is critical — same input must produce same output
- JSON rules are human-readable and version-controllable
- Active maintenance (last release within 6 months)

### Consequences

- Rules must be expressed in JSON schema (not natural language)
- Need to build our own rule builder UI
- Complex rules may require custom operators

### Example Usage

```typescript
import { Engine } from 'json-rules-engine';

const engine = new Engine();

engine.addRule({
  conditions: {
    all: [
      { fact: 'requested_discount', operator: 'greaterThan', value: 0.15 },
      { fact: 'customer_segment', operator: 'notEqual', value: 'platinum' },
    ],
  },
  event: {
    type: 'escalate',
    params: {
      message: 'Discounts over 15% for non-platinum customers require approval',
    },
  },
  priority: 10,
});

const result = await engine.run({
  requested_discount: 0.18,
  customer_segment: 'gold',
  order_value: 5000,
});
```

---

## Decision 2: LLM Provider for Simulation

> **Status: PLANNED** — Will be implemented in `packages/simulation/`

### Decision

Use **OpenAI GPT-4o-mini** via Batch API for buyer persona simulation.

### Alternatives Considered

| Option                    | Pros                                       | Cons                                       |
| ------------------------- | ------------------------------------------ | ------------------------------------------ |
| **GPT-4o-mini (Batch)**   | 50% cost savings, sufficient quality, fast | Async processing, 24hr window              |
| **GPT-4o (Realtime)**     | Best quality, streaming                    | Expensive for simulation volume            |
| **Claude 3.5 Sonnet**     | Excellent reasoning                        | No batch API, higher cost                  |
| **Llama 3 (Self-hosted)** | Free inference                             | Infrastructure overhead, GPU costs         |
| **GPT-3.5-turbo**         | Cheapest                                   | Quality may not capture negotiation nuance |

### Rationale

- Batch API provides 50% cost reduction — critical for running thousands of simulations
- GPT-4o-mini quality is sufficient for persona-based negotiation (not complex reasoning)
- 24-hour completion window is acceptable for simulation (not real-time)
- Well-documented API, TypeScript SDK available

### Cost Projection

```text
Per simulation run (1000 negotiations):
- ~500 tokens/negotiation average
- 500,000 tokens total
- GPT-4o-mini batch: ~$0.075/1M input, ~$0.30/1M output
- Estimated cost: ~$0.20 per 1000-negotiation simulation
```

### Consequences

- Must design for async batch processing
- Need to handle batch job polling/completion
- Results available in batches, not streaming

---

## Decision 3: Database

> **Status: PLANNED** — Schema defined, not yet deployed

### Decision

Use **Supabase** (managed PostgreSQL) for all persistence.

### Alternatives Considered

| Option                 | Pros                                       | Cons                                      |
| ---------------------- | ------------------------------------------ | ----------------------------------------- |
| **Supabase**           | Free tier, managed, good DX, auth included | Vendor lock-in potential                  |
| **PlanetScale**        | MySQL, branching                           | MySQL less familiar, no free tier changes |
| **Railway PostgreSQL** | Simple, co-located                         | Less features than Supabase               |
| **SQLite**             | Zero config, file-based                    | Not suitable for production multi-client  |
| **MongoDB**            | Flexible schema                            | Overkill, relational data fits better     |

### Rationale

- Free tier sufficient for MVP (500MB, unlimited API requests)
- PostgreSQL provides JSONB for flexible policy schema storage
- Supabase provides instant REST API (reduces backend code)
- Row-level security available for future multi-tenant
- Excellent local dev experience with `supabase start`

### Data Models

```sql
-- Policies table
CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  rules JSONB NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Simulations table
CREATE TABLE simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES policies(id),
  config JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Simulation results table
CREATE TABLE simulation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id),
  persona_id TEXT NOT NULL,
  order_data JSONB NOT NULL,
  negotiation_log JSONB NOT NULL,
  outcome TEXT NOT NULL,
  final_discount DECIMAL(5,4),
  margin_impact DECIMAL(10,2),
  turns INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  policy_id UUID REFERENCES policies(id),
  input JSONB,
  output JSONB,
  timestamp TIMESTAMPTZ DEFAULT now()
);
```

---

## Decision 4: MCP Framework

> **Status: PLANNED** — Package scaffolded at `packages/mcp-server/`

### Decision

Use **@modelcontextprotocol/sdk** (official TypeScript SDK) for MCP server implementation.

### Rationale

- Official SDK maintained by Anthropic
- TypeScript-native with full type safety
- Supports both stdio (local dev) and HTTP/SSE (production) transports
- Well-documented with examples
- Already used successfully in logpare-MCP

### MCP Tool Interface

```typescript
// Primary tool exposed by Guardrail-Sim
{
  name: 'evaluate_policy',
  description: 'Evaluate a proposed discount against the active pricing policy',
  inputSchema: {
    type: 'object',
    properties: {
      order: {
        type: 'object',
        properties: {
          order_value: { type: 'number' },
          quantity: { type: 'number' },
          customer_segment: { type: 'string' },
          product_margin: { type: 'number' }
        },
        required: ['order_value', 'quantity', 'product_margin']
      },
      proposed_discount: { type: 'number' },
      policy_id: { type: 'string' }
    },
    required: ['order', 'proposed_discount']
  }
}
```

---

## Decision 5: Frontend Stack

> **Status: PLANNED** — Package scaffolded at `apps/dashboard/`

### Decision

Use **Next.js 14 (App Router)** with **shadcn/ui** components.

### Alternatives Considered

| Option                  | Pros                                | Cons                              |
| ----------------------- | ----------------------------------- | --------------------------------- |
| **Next.js + shadcn/ui** | Target employer stack, modern, fast | Learning curve for App Router     |
| **Remix**               | Great DX, server-focused            | Less common in target companies   |
| **Vue/Nuxt**            | Familiar from ABG work              | Not aligned with target companies |
| **Plain React + Vite**  | Simple, fast builds                 | Need to add routing, SSR manually |

### Rationale

- Next.js is used by Vercel (target employer) and many YC startups
- shadcn/ui provides professional components without heavy dependencies
- App Router demonstrates modern React patterns (server components, streaming)
- Built-in API routes reduce need for separate backend
- Tailwind CSS for rapid styling

### Key UI Components

```text
/app
├── page.tsx                    # Dashboard home
├── policies/
│   ├── page.tsx               # Policy list
│   ├── [id]/page.tsx          # Policy editor
│   └── new/page.tsx           # Create policy
├── simulations/
│   ├── page.tsx               # Simulation list
│   ├── [id]/page.tsx          # Simulation results
│   └── new/page.tsx           # Configure simulation
└── api/
    ├── policies/route.ts      # CRUD for policies
    ├── simulations/route.ts   # Run simulations
    └── mcp/route.ts           # MCP HTTP endpoint
```

---

## Decision 6: Deployment Architecture

> **Status: PLANNED** — Local development only for MVP

### Decision

Split deployment across three services optimized for each workload.

| Component      | Platform | Why                                           |
| -------------- | -------- | --------------------------------------------- |
| **Dashboard**  | Vercel   | Next.js optimized, free tier, target employer |
| **MCP Server** | Railway  | Long-running process, WebSocket support       |
| **Database**   | Supabase | Managed PostgreSQL, free tier                 |

### Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                         VERCEL                               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Next.js Dashboard                       │    │
│  │  - Policy Editor UI                                  │    │
│  │  - Simulation Results Viewer                         │    │
│  │  - Comparison Charts                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   RAILWAY     │   │   SUPABASE    │   │   OPENAI      │
│               │   │               │   │               │
│  MCP Server   │   │  PostgreSQL   │   │  Batch API    │
│  - evaluate   │◄─►│  - Policies   │   │  - Personas   │
│  - HTTP/SSE   │   │  - Results    │   │  - Negotiate  │
│               │   │  - Audit Log  │   │               │
└───────────────┘   └───────────────┘   └───────────────┘
        ▲
        │
┌───────────────┐
│  AI AGENTS    │
│  (Claude, GPT)│
└───────────────┘
```

---

## Decision 7: Test Data Strategy

> **Status: PLANNED** — Will be implemented in `packages/simulation/`

### Decision

Use **synthetic data generation** exclusively — no real merchant data.

### Rationale

- No NDA/confidentiality concerns
- Fully controllable test scenarios
- Reproducible results
- Can demonstrate without client permission
- Scales infinitely

### Synthetic Data Schema

```typescript
interface SyntheticOrder {
  id: string;
  order_value: number; // $500 - $50,000
  quantity: number; // 10 - 1000
  product_margin: number; // 0.25 - 0.60 (25-60%)
  customer_segment: 'new' | 'bronze' | 'silver' | 'gold' | 'platinum';
  customer_history: {
    lifetime_value: number;
    order_count: number;
    avg_order_value: number;
    last_order_days_ago: number;
  };
  product_category: string;
  is_seasonal: boolean;
}

// Generation distribution
const distributions = {
  order_value: { min: 500, max: 50000, skew: 'log-normal' },
  quantity: { min: 10, max: 1000, skew: 'normal' },
  customer_segment: {
    new: 0.3,
    bronze: 0.25,
    silver: 0.2,
    gold: 0.15,
    platinum: 0.1,
  },
};
```

---

## Decision 8: Buyer Persona System

> **Status: PLANNED** — Will be implemented in `packages/simulation/`

### Decision

Implement **5 distinct LLM-driven buyer personas** for adversarial simulation.

### Persona Definitions

```typescript
const BUYER_PERSONAS = {
  aggressive_negotiator: {
    name: 'Aggressive Negotiator',
    description: 'Always pushes for maximum discount, threatens to walk',
    systemPrompt: `You are a tough B2B procurement manager...`,
    expectedDiscountRange: [0.15, 0.3],
    acceptanceThreshold: 0.1,
    maxTurns: 5,
  },

  relationship_builder: {
    name: 'Relationship Builder',
    description: 'Values partnership, willing to accept smaller discounts for reliability',
    systemPrompt: `You are a procurement manager who values long-term relationships...`,
    expectedDiscountRange: [0.05, 0.15],
    acceptanceThreshold: 0.03,
    maxTurns: 3,
  },

  data_driven_analyst: {
    name: 'Data-Driven Analyst',
    description: 'Cites competitor prices, market rates, uses data in negotiations',
    systemPrompt: `You are an analytical buyer who always has market data...`,
    expectedDiscountRange: [0.1, 0.2],
    acceptanceThreshold: 0.05,
    maxTurns: 4,
  },

  budget_constrained: {
    name: 'Budget Constrained',
    description: 'Has a hard ceiling, will walk if price exceeds budget',
    systemPrompt: `You have a fixed budget that cannot be exceeded...`,
    expectedDiscountRange: [0.08, 0.18],
    acceptanceThreshold: 0.15,
    maxTurns: 3,
  },

  quick_closer: {
    name: 'Quick Closer',
    description: 'Values speed over maximum savings, accepts reasonable offers quickly',
    systemPrompt: `You need to close this deal quickly...`,
    expectedDiscountRange: [0.05, 0.08],
    acceptanceThreshold: 0.03,
    maxTurns: 2,
  },
};
```

---

## Decision Log Summary

| #   | Decision       | Choice                      | Status | Key Rationale                           |
| --- | -------------- | --------------------------- | ------ | --------------------------------------- |
| 1   | Policy Engine  | json-rules-engine           | **Done** | Deterministic, JS-native, battle-tested |
| 2   | LLM Provider   | OpenAI GPT-4o-mini Batch    | Planned | 50% cost savings, sufficient quality    |
| 3   | Database       | Supabase (Postgres)         | Planned | Free tier, managed, good DX             |
| 4   | MCP Framework  | @modelcontextprotocol/sdk   | Planned | Official SDK, TypeScript                |
| 5   | Frontend       | Next.js + shadcn/ui         | Planned | Target employer stack, modern           |
| 6   | Deployment     | Vercel + Railway + Supabase | Planned | Right tool for each component           |
| 7   | Test Data      | Synthetic generation        | Planned | NDA-safe, controllable, reproducible    |
| 8   | Buyer Personas | 5 LLM-driven personas       | Planned | Realistic negotiation patterns          |

---

## References

- [json-rules-engine documentation](https://github.com/CacheControl/json-rules-engine)
- [OpenAI Batch API](https://platform.openai.com/docs/guides/batch)
- [MCP SDK TypeScript](https://github.com/modelcontextprotocol/typescript-sdk)
- [Supabase documentation](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [shadcn/ui components](https://ui.shadcn.com/)
