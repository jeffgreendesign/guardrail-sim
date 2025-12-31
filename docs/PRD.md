# Guardrail-Sim: Product Requirements Document

**Version:** 1.0
**Created:** December 29, 2025
**Author:** Jeff Green
**Status:** MVP In Progress
**Last Updated:** December 30, 2025

---

## Executive Summary

Guardrail-Sim is a **policy simulation engine** that lets e-commerce merchants backtest AI agent pricing and discount rules against synthetic negotiations before deploying autonomous agents to interact with real B2B wholesale buyers.

**The one-liner:**

> "Before letting an AI agent negotiate discounts with your wholesale customers, simulate 1,000 negotiations to answer: How much margin would you lose?"

**The interview hook:**

> "Everyone is building the gas pedal (AI agents that sell). I built the brakes and steering (Policy Engine). Before a brand lets an LLM offer discounts, they need to know what happens when the agent gives away margin at scale."

---

## Problem Statement

### The Market Shift

- Gartner predicts 90% of B2B purchases will be AI-agent-driven by 2028
- Shopify launched "Commerce for Agents" toolkit (Nov 2025)
- Enterprises are beginning to deploy autonomous negotiation agents for wholesale/B2B

### The Gap

Every demo shows AI agents _closing deals_. Nobody shows what happens when:

- The agent approves too many discounts
- Margin floors get violated under edge cases
- Certain buyer personas exploit policy loopholes
- Escalation triggers fire too often (or not enough)

### The Risk

Without simulation, merchants face:

- **Margin erosion at scale** — 1% discount leakage × 10,000 orders = real money
- **Policy blind spots** — rules that seemed reasonable fail under adversarial buyers
- **No audit trail** — when something goes wrong, no way to diagnose why
- **Compliance gaps** — B2B contracts often have negotiated terms that agents might violate

### The Insight

Enterprises don't want to see the chatbot demo. They want to see the **governance math**:

- "If we ran this policy on last quarter's orders, what would have happened?"
- "Which buyer segments cause the most escalations?"
- "Where are the margin leaks?"

---

## Solution Overview

Guardrail-Sim is a three-layer system:

```text
┌─────────────────────────────────────────────────────────────┐
│                      DASHBOARD (Next.js)                     │
│  Policy Editor │ Simulation Results │ Comparison View        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   SIMULATION ENGINE (Node.js)                │
│  Synthetic Orders │ Buyer Personas │ Negotiation Loop        │
│  LLM-as-Adversary │ Result Logging │ Margin Calculation      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    POLICY ENGINE (Deterministic)             │
│  json-rules-engine │ Margin Floors │ Volume Tiers            │
│  Escalation Triggers │ Customer Segment Rules                │
│                                                              │
│  Exposed via MCP Server: evaluate_policy(order, discount)    │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision     | Choice                            | Rationale                                                                                  |
| ------------ | --------------------------------- | ------------------------------------------------------------------------------------------ |
| Policy logic | Deterministic (json-rules-engine) | LLMs should never touch pricing math. Predictable, auditable, testable.                    |
| LLM role     | Adversarial buyer simulation only | LLM generates realistic negotiation attempts; policy engine decides outcomes.              |
| Integration  | MCP server                        | Production AI agents can call `evaluate_policy()` at runtime. Extends to Claude, GPT, etc. |
| Data         | Synthetic orders                  | No dependency on real merchant data. Demonstrable without NDA concerns.                    |

---

## Target Users

### Primary: Revenue Operations Leaders

- **Title:** VP Revenue Ops, Director of Wholesale, B2B Operations Manager
- **Pain:** "I can't let an AI agent negotiate until I know the margin impact"
- **Need:** Simulation results they can present to CFO/CEO before deployment
- **Buying trigger:** Company is evaluating or piloting AI agents for B2B

### Secondary: Platform Engineers

- **Title:** Senior Engineer, Staff Engineer, Platform Architect
- **Pain:** "I need to build guardrails into our agentic commerce system"
- **Need:** A policy engine they can integrate via API/MCP
- **Buying trigger:** Building internal AI agent infrastructure

### Tertiary: E-commerce Consultants / Agencies

- **Title:** Solutions Architect, Technical Consultant
- **Pain:** "My clients ask about AI agents but I can't quantify the risk"
- **Need:** A tool to run simulations during client discovery
- **Buying trigger:** Client conversations about AI commerce

---

## Core Features (MVP Scope)

### Feature 1: Policy Editor

**User story:** As a RevOps leader, I want to define pricing rules in a structured format so the system can enforce them consistently.

**Capabilities:**

- JSON-based policy definition with visual editor
- Rule types supported:
  - Maximum discount percentage (global)
  - Volume-based discount tiers
  - Customer segment pricing (e.g., "Gold tier gets +5% max")
  - Margin floor enforcement (never go below X%)
  - Escalation triggers (when to require human approval)
- Validation feedback (syntax errors, logical conflicts)
- Save/load multiple policy versions

**Example policy structure:**

```json
{
  "policy_name": "Q1 2026 Wholesale Policy",
  "version": "1.0",
  "rules": [
    {
      "name": "margin_floor",
      "condition": "calculated_margin < 0.15",
      "action": "reject",
      "message": "Discount would violate 15% margin floor"
    },
    {
      "name": "volume_tier_1",
      "condition": "order_quantity >= 100 AND order_quantity < 500",
      "action": "allow_max_discount",
      "max_discount": 0.1
    },
    {
      "name": "escalation_trigger",
      "condition": "requested_discount > 0.20",
      "action": "escalate",
      "message": "Discounts over 20% require manager approval"
    }
  ]
}
```

### Feature 2: Simulation Engine

**User story:** As a RevOps leader, I want to simulate thousands of negotiations against my policy so I can see the margin impact before going live.

**Capabilities:**

- Generate synthetic B2B orders with realistic distributions:
  - Order values: $500 - $50,000
  - SKU counts: 5 - 200 per order
  - Customer segments: New, Bronze, Silver, Gold, Platinum
- Define buyer personas (LLM-powered adversaries):
  - "Budget Constrained" — always asks for maximum discount
  - "Relationship Builder" — accepts reasonable offers quickly
  - "Aggressive Negotiator" — pushes boundaries, tests edge cases
  - "Volume Buyer" — leverages quantity for better terms
  - "Price Insensitive" — focuses on delivery/terms, not discount
- Run negotiation loops (max 3-5 turns per simulation)
- Log every turn: request, policy evaluation, response, final outcome
- Calculate aggregate metrics:
  - Total margin impact ($ saved vs. uncontrolled agent)
  - Policy violation rate
  - Escalation frequency
  - Acceptance rate by persona

**Simulation output:**

```json
{
  "simulation_id": "sim_20260115_001",
  "policy_version": "Q1 2026 Wholesale Policy v1.0",
  "orders_simulated": 1000,
  "summary": {
    "total_revenue": 12500000,
    "margin_without_policy": 1875000,
    "margin_with_policy": 2187500,
    "margin_saved": 312500,
    "margin_saved_percent": 16.67,
    "avg_discount_approved": 0.082,
    "escalation_rate": 0.12,
    "rejection_rate": 0.08
  },
  "by_persona": {
    "aggressive_negotiator": {
      "orders": 200,
      "avg_discount_requested": 0.18,
      "avg_discount_approved": 0.11,
      "escalation_rate": 0.35
    }
    // ... other personas
  }
}
```

### Feature 3: Results Dashboard

**User story:** As a RevOps leader, I want to visualize simulation results so I can make data-driven decisions about policy changes.

**MVP Views (3 screens only):**

1. **Policy Editor View**
   - JSON editor with syntax highlighting
   - Real-time validation
   - Save/load policy versions

2. **Simulation Results View**
   - Summary cards (4 key metrics)
   - Results table (sortable by order ID, persona, discount, margin impact)
   - Filter by persona, outcome type, margin impact range

3. **Policy Comparison View** (stretch goal)
   - Side-by-side: Policy A vs Policy B
   - Differential metrics: "Policy B saves $X more margin but escalates Y% more"

**UI Framework:** Next.js App Router + shadcn/ui + Tailwind
**Design aesthetic:** "Linear-style" — clean, minimal, data-focused

### Feature 4: MCP Server Interface

**User story:** As a platform engineer, I want to call the policy engine from my AI agent so it respects our pricing rules at runtime.

**MCP Tool Definition:**

```typescript
{
  name: "evaluate_policy",
  description: "Evaluate a proposed discount against the active pricing policy",
  parameters: {
    order: {
      type: "object",
      properties: {
        order_value: { type: "number" },
        quantity: { type: "number" },
        customer_segment: { type: "string" },
        product_margin: { type: "number" }
      }
    },
    proposed_discount: { type: "number" },
    policy_id: { type: "string", optional: true }
  },
  returns: {
    approved: { type: "boolean" },
    max_allowed_discount: { type: "number" },
    reason: { type: "string" },
    action: { type: "string", enum: ["approve", "reject", "escalate", "counter"] },
    counter_offer: { type: "number", optional: true }
  }
}
```

---

## Non-Goals (Out of Scope for MVP)

| Not Building                 | Why                                                                    |
| ---------------------------- | ---------------------------------------------------------------------- |
| Real Shopify integration     | Requires merchant credentials; synthetic data is more demonstrable     |
| User authentication          | Single-user tool for MVP; auth adds complexity without portfolio value |
| Multi-tenant / SaaS features | This is a portfolio project, not a startup                             |
| Historical data import       | Synthetic generation is sufficient for demo                            |
| Real-time agent deployment   | Simulation-only for MVP; production integration is future work         |
| Graphs/charts in dashboard   | Tables first; visualization is Week 5+ if time permits                 |
| Mobile responsive design     | Desktop-only for MVP                                                   |

---

## Technical Architecture

### Stack Decisions

| Layer                 | Technology                                     | Rationale                                                          |
| --------------------- | ---------------------------------------------- | ------------------------------------------------------------------ |
| **Policy Engine**     | Node.js + json-rules-engine                    | Battle-tested rules engine; JS ecosystem consistency               |
| **Simulation Runner** | Node.js + OpenAI API                           | LLM for buyer persona simulation; Batch API for cost efficiency    |
| **Database**          | PostgreSQL (Supabase)                          | Relational for structured simulation results; free tier sufficient |
| **MCP Server**        | TypeScript + @modelcontextprotocol/sdk         | Extends logpare-MCP patterns; production-ready protocol            |
| **Dashboard**         | Next.js 14 (App Router) + shadcn/ui + Tailwind | Modern React; consistent with target employer stacks               |
| **Deployment**        | Vercel (dashboard) + Railway (MCP server)      | Free/cheap tiers; demonstrates cloud deployment                    |

### Data Models

**Policy Schema:**

```typescript
interface Policy {
  id: string;
  name: string;
  version: string;
  created_at: Date;
  rules: PolicyRule[];
  metadata: {
    author: string;
    description: string;
  };
}

interface PolicyRule {
  name: string;
  priority: number;
  condition: RuleCondition;
  action: 'approve' | 'reject' | 'escalate' | 'counter';
  parameters: {
    max_discount?: number;
    counter_offer?: number;
    message?: string;
  };
}
```

**Simulation Result Schema:**

```typescript
interface SimulationRun {
  id: string;
  policy_id: string;
  created_at: Date;
  config: {
    order_count: number;
    personas: string[];
    max_turns: number;
  };
  summary: SimulationSummary;
  results: SimulationResult[];
}

interface SimulationResult {
  order_id: string;
  persona: string;
  turns: NegotiationTurn[];
  final_outcome: 'approved' | 'rejected' | 'escalated';
  final_discount: number;
  margin_impact: number;
}

interface NegotiationTurn {
  turn_number: number;
  buyer_request: string;
  requested_discount: number;
  policy_evaluation: PolicyEvaluation;
  agent_response: string;
}
```

### API Contracts

**POST /api/simulate**

```typescript
// Request
{
  policy_id: string;
  config: {
    order_count: number;        // 100-10000
    personas: string[];         // ["aggressive", "budget", "relationship"]
    max_turns: number;          // 3-5
    order_value_range: [number, number];
  }
}

// Response
{
  simulation_id: string;
  status: "running" | "complete" | "failed";
  progress?: number;            // 0-100 if running
  summary?: SimulationSummary;  // if complete
}
```

**POST /api/policy/evaluate** (also exposed via MCP)

```typescript
// Request
{
  order: Order;
  proposed_discount: number;
  policy_id?: string;           // uses active policy if not specified
}

// Response
{
  approved: boolean;
  max_allowed_discount: number;
  action: "approve" | "reject" | "escalate" | "counter";
  reason: string;
  counter_offer?: number;
  rule_triggered: string;       // which rule made the decision
}
```

---

## Success Criteria

### Portfolio Success (Primary Goal)

| Metric                        | Target | Measurement                                       |
| ----------------------------- | ------ | ------------------------------------------------- |
| Demo-able in interview        | Yes    | Can walk through full flow in <5 minutes          |
| Explains systems thinking     | Yes    | Architecture diagram shows separation of concerns |
| Proves AI integration depth   | Yes    | LLM-as-adversary is non-trivial AI use            |
| Shows end-to-end ownership    | Yes    | DB → API → MCP → UI all built                     |
| Differentiates from tutorials | Yes    | Not a todo app; solves real emerging problem      |

### Technical Success

| Metric                        | Target                | Measurement              |
| ----------------------------- | --------------------- | ------------------------ |
| Simulation completes          | 1000 orders in <5 min | Timed benchmark          |
| Policy evaluation latency     | <100ms p95            | MCP server response time |
| Dashboard loads               | <2s LCP               | Lighthouse               |
| No critical bugs in demo flow | 0                     | Manual testing           |

### Narrative Success

| Metric                      | Target | Measurement                      |
| --------------------------- | ------ | -------------------------------- |
| "Gas pedal vs brakes" lands | Yes    | Interviewer engagement           |
| Quantified impact story     | Yes    | "Policy B saves 23% more margin" |
| Future roadmap articulated  | Yes    | Can describe v2 features         |

---

## Development Plan

### Week 1: Policy Engine Core (15 hours)

**Goal:** Working MCP server that evaluates policies

- [x] Set up TypeScript monorepo (policy-engine, simulation, dashboard)
- [x] Implement json-rules-engine integration
- [x] Define sample policies (default policy with 3 rules: margin floor, max discount, volume tiers)
- [ ] Build MCP server with `evaluate_policy` tool
- [ ] Test with Claude Desktop / MCP Inspector
- [ ] **Deliverable:** MCP server deployed to Railway, callable from Claude

> **Progress Note:** Policy engine is complete with 8 passing tests. MCP server and remaining packages are scaffolded.

### Week 2: Simulation Framework (15 hours)

**Goal:** CLI that simulates negotiations and outputs results

- [ ] Design synthetic order generator with realistic distributions
- [ ] Define 5 buyer personas as system prompts
- [ ] Build negotiation loop (buyer LLM ↔ policy engine)
- [ ] Implement result logging to PostgreSQL
- [ ] Create CLI: `npm run simulate --orders=100 --policy=default`
- [ ] **Deliverable:** Can run simulation and see results in database

### Week 3: Dashboard MVP (15 hours)

**Goal:** Web UI for policy editing and results viewing

- [ ] Next.js project setup with shadcn/ui
- [ ] Policy Editor view (JSON + validation)
- [ ] Results Table view (sortable, filterable)
- [ ] Summary Cards (4 key metrics)
- [ ] Connect to Supabase backend
- [ ] Deploy to Vercel
- [ ] **Deliverable:** Live URL showing simulation results

### Week 4: Story & Polish (15 hours)

**Goal:** Portfolio-ready with demo video

- [ ] Add Policy Comparison view (if time permits)
- [ ] Record 3-minute Loom walkthrough
- [ ] Write case study for portfolio site
- [ ] Create architecture diagram
- [ ] Add to GitHub with comprehensive README
- [ ] **Deliverable:** Complete portfolio piece

---

## Risks and Mitigations

| Risk                                    | Likelihood | Impact | Mitigation                                                    |
| --------------------------------------- | ---------- | ------ | ------------------------------------------------------------- |
| Simulation too slow                     | Medium     | High   | Use OpenAI Batch API; parallelize; cache LLM responses        |
| LLM costs exceed budget                 | Medium     | Medium | Batch API is 50% cheaper; limit simulation size for demos     |
| Scope creep to real Shopify integration | High       | Medium | Explicitly out of scope; synthetic data is MORE demonstrable  |
| json-rules-engine too limited           | Low        | High   | Evaluated alternatives; sufficient for MVP rule types         |
| Dashboard polish eats all time          | High       | Medium | Strict 3-view limit; no graphs in MVP                         |
| Market validates competitor exists      | Medium     | High   | Pivot to "Agent Readiness Audit" if research shows saturation |

---

## Open Questions (To Resolve During Build)

1. **Buyer persona prompts:** How detailed should system prompts be? Need to balance realism vs. token cost.
2. **Negotiation turn limit:** 3 turns or 5? More turns = more realistic but slower/costlier.
3. **Policy versioning:** How important is version history for MVP? Could defer to v2.
4. **Export formats:** Should simulation results export to CSV/PDF? Useful for "show your CFO" use case.
5. **Cost tracking:** Should we show "this simulation cost $X in API calls"? Good for meta-narrative about AI cost awareness.

---

## Future Roadmap (Post-MVP)

### v1.1: Enhanced Simulation

- Historical data import (CSV upload)
- More buyer personas
- Custom persona builder
- Longer negotiation chains

### v1.2: Production Integration

- Shopify Draft Orders integration
- Real-time policy enforcement (not just simulation)
- Webhook notifications for escalations

### v1.3: Analytics & Reporting

- Time-series analysis (policy performance over time)
- Exportable reports (PDF for executives)
- Scheduled simulation runs

### v2.0: Multi-Agent Governance

- Support for multiple agent types (not just negotiation)
- Inventory agents, support agents, fulfillment agents
- Unified policy framework across agent fleet

---

## References

- [Shopify Commerce for Agents](https://www.shopify.com/news/winter-26-edition-agentic-storefronts) — Platform context
- [Gartner: AI Agents in B2B](https://www.digitalcommerce360.com/2025/11/28/gartner-ai-agents-15-trillion-in-b2b-purchases-by-2028/) — Market timing validation
- [json-rules-engine](https://github.com/CacheControl/json-rules-engine) — Policy engine library
- [Model Context Protocol](https://modelcontextprotocol.io/) — MCP specification
- [logpare-MCP](https://github.com/jeffgreendesign/logpare-mcp) — Prior MCP server work (reference implementation)

---

## Appendix: Interview Story Script

### The Hook (30 seconds)

"Everyone's building AI agents that can negotiate B2B deals. But nobody's asking: what happens when that agent gives away your margin at scale? I built Guardrail-Sim — a policy simulation engine that lets you backtest pricing rules against thousands of synthetic negotiations before you deploy."

### The Architecture (60 seconds)

"The key insight is separation of concerns. The LLM should never touch pricing math — that's deterministic policy logic. So I built a rules engine that enforces margin floors, volume tiers, and escalation triggers. The LLM's only job is simulating adversarial buyers — different personas trying to negotiate discounts. The policy engine decides what's allowed."

### The Demo (90 seconds)

"Let me show you. Here's a policy: max 12% discount, 15% margin floor, escalate anything over 20%. I run a simulation — 1,000 orders, five buyer personas including an 'aggressive negotiator' that always pushes boundaries. Results: Policy A saves $312K in margin compared to an uncontrolled agent. But the aggressive persona causes 35% escalation rate — maybe the policy is too tight for that segment."

### The Insight (30 seconds)

"This is the infrastructure layer that has to exist before agentic commerce scales. Everyone's building the gas pedal. I built the brakes and steering."

### The Future (30 seconds)

"MVP is simulation-only. Next step is real-time integration — the MCP server becomes a guardrail that production agents call before approving any discount. Same policy engine, just moved from simulation to enforcement."
