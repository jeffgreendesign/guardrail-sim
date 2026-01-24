# Simulation Package Design

Research-informed design for the guardrail-sim simulation engine, based on recent advancements in adversarial LLM testing and multi-agent commerce simulation (January 2026).

## Overview

The simulation package implements adversarial buyer personas that stress-test pricing policies before deployment. The key insight from ARLAS research: train attackers and defenders simultaneously to avoid overfitting to narrow attack vectors.

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Simulation Runner                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Scenario  │  │   Session   │  │    Results Collector    │  │
│  │   Loader    │  │   Manager   │  │    & Analyzer           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│  Buyer Persona  │  │  Policy Engine  │  │   Metric Recorder   │
│    (LLM-based)  │  │  (Deterministic)│  │                     │
│                 │  │                 │  │  - Margin erosion   │
│  Strategies:    │  │  json-rules-    │  │  - Attack success   │
│  - Aggressive   │  │  engine         │  │  - Policy coverage  │
│  - Strategic    │  │                 │  │  - Edge cases found │
│  - Adversarial  │  │                 │  │                     │
└─────────────────┘  └─────────────────┘  └─────────────────────┘
```

## Key Components

### 1. Buyer Personas (Inspired by ARLAS)

Instead of static buyer profiles, use LLM-generated personas that adapt strategies:

```typescript
interface BuyerPersona {
  id: string;
  name: string;
  strategy: 'cooperative' | 'strategic' | 'adversarial';

  // LLM-driven behavior parameters
  systemPrompt: string;
  objectives: string[];
  constraints: string[];

  // Attack surface (for adversarial personas)
  attackVectors?: AttackVector[];
}

interface AttackVector {
  type: 'volume_gaming' | 'code_stacking' | 'boundary_probing' | 'segment_spoofing';
  description: string;
  examples: string[];
}
```

**Persona Types:**

| Persona         | Strategy    | Goal                           |
| --------------- | ----------- | ------------------------------ |
| Budget Buyer    | Cooperative | Find best legitimate discount  |
| Strategic Buyer | Strategic   | Maximize value within rules    |
| Margin Hunter   | Adversarial | Exploit policy edge cases      |
| Code Stacker    | Adversarial | Combine discounts unexpectedly |
| Volume Gamer    | Adversarial | Game volume tier thresholds    |

### 2. Negotiation Loop

Based on the LLM-Deliberation framework:

```typescript
interface NegotiationSession {
  id: string;
  buyer: BuyerPersona;
  initialOrder: Order;

  // Negotiation state
  rounds: NegotiationRound[];
  maxRounds: number;

  // Outcome
  finalDiscount?: number;
  outcome: 'accepted' | 'rejected' | 'escalated' | 'abandoned';
}

interface NegotiationRound {
  roundNumber: number;

  // Buyer's move
  buyerRequest: DiscountRequest;
  buyerReasoning?: string; // concise rationale summary (avoid full chain-of-thought)

  // Policy response
  policyEvaluation: EvaluationResult;

  // Seller response (deterministic from policy)
  sellerResponse: SellerResponse;

  // Metrics
  marginImpact: number;
  timestamp: Date;
}
```

### 3. Adversarial Attack Library

Inspired by LLMart's attack catalog, adapted for pricing:

```typescript
const ATTACK_SCENARIOS = {
  // Volume tier boundary attacks
  volumeBoundary: {
    description: 'Orders just below/above tier thresholds',
    generator: (tiers: VolumeTier[]) => generateBoundaryOrders(tiers),
  },

  // Discount stacking attacks
  codeStacking: {
    description: 'Attempt multiple discount combinations',
    generator: (codes: string[]) => generateStackingAttempts(codes),
  },

  // Segment spoofing
  segmentEscalation: {
    description: 'Claim higher-value segment for better rates',
    generator: (segments: string[]) => generateSegmentClaims(segments),
  },

  // Margin floor probing
  marginProbing: {
    description: 'Incrementally increase discount requests',
    generator: (floor: number) => generateMarginProbes(floor),
  },

  // Time-based attacks
  expirationRacing: {
    description: 'Exploit timing around discount expiration',
    generator: (discount: Discount) => generateTimingAttacks(discount),
  },
};
```

### 4. Population-Based Training (from ARLAS)

Key insight: Don't just test against one attacker—maintain a population:

```typescript
interface SimulationPopulation {
  // Historical attacker checkpoints
  attackerHistory: BuyerPersona[];

  // Successful attack patterns discovered
  discoveredVulnerabilities: Vulnerability[];

  // Policy versions tested
  policyVersions: PolicyVersion[];
}

// Run policy against all historical attackers
async function evaluatePolicyRobustness(
  policy: Policy,
  population: SimulationPopulation
): Promise<RobustnessScore> {
  const results = await Promise.all(
    population.attackerHistory.map((attacker) => runSimulation(attacker, policy))
  );

  return aggregateRobustnessScore(results);
}
```

### 5. Metrics & Analysis

Based on multi-agent testing frameworks:

```typescript
interface SimulationMetrics {
  // Core metrics
  totalSimulations: number;
  attackSuccessRate: number;
  averageMarginErosion: number;

  // Policy coverage
  rulesTriggered: Map<string, number>;
  edgeCasesDiscovered: EdgeCase[];

  // Emergent behaviors
  unexpectedPatterns: Pattern[];

  // Recommendations
  suggestedPolicyChanges: PolicyRecommendation[];
}

interface EdgeCase {
  scenario: string;
  order: Order;
  discountRequest: number;
  expected: 'approve' | 'reject';
  actual: 'approve' | 'reject';
  marginImpact: number;
}
```

## Implementation Roadmap

### Phase 1: Foundation

- [ ] Define persona types and configuration schema
- [ ] Implement basic negotiation loop
- [ ] Create synthetic order generator
- [ ] Build results collector

### Phase 2: LLM Integration

- [ ] OpenAI Batch API integration for personas
- [ ] Chain-of-thought reasoning capture
- [ ] Persona strategy adaptation between rounds

### Phase 3: Adversarial Testing

- [ ] Implement attack scenario library
- [ ] Add population-based evaluation
- [ ] Build vulnerability discovery pipeline

### Phase 4: Analysis & Reporting

- [ ] Metrics dashboard
- [ ] Policy recommendation engine (via @guardrail-sim/insights)
- [ ] Export to simulation replay format

## Technology Choices

| Component       | Choice              | Rationale                            |
| --------------- | ------------------- | ------------------------------------ |
| LLM Provider    | OpenAI Batch API    | Cost-effective for large simulations |
| Persona Storage | JSON files          | Simple, version-controllable         |
| Results Storage | SQLite / Supabase   | Queryable, exportable                |
| Parallelization | Node worker threads | Avoid API rate limits                |

## Key Research References

1. **ARLAS** (OpenReview) - Two-player adversarial RL for agent safety
2. **LLMart** (Intel Labs) - Adversarial robustness toolkit
3. **LLM-Deliberation** - Multi-agent negotiation benchmarks
4. **LLM-MAS Marketplace** (arXiv:2511.13233) - Strategic marketplace simulation

## Security Considerations

Per the CLAUDE.md constraint ("LLMs simulate adversarial buyers only. Pricing math is always deterministic via the rules engine"), ensure:

1. LLMs never compute final prices—only generate requests
2. Policy engine remains the single source of truth
3. Adversarial outputs are sandboxed and logged
4. No prompt injection paths from simulation to production
