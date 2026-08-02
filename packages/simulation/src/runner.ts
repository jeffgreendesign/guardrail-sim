/**
 * Simulation runner — the core negotiation loop.
 *
 * Runs buyer personas against the policy engine, collecting sessions and metrics.
 */

import { PolicyEngine } from '@guardrail-sim/policy-engine';
import type {
  BuyerPersona,
  NegotiationSession,
  NegotiationRound,
  SimulationConfig,
  SimulationResults,
  PersonaProvider,
} from './types.js';
import { createRng } from './rng.js';
import { createDeterministicProvider } from './personas.js';
import { calculateMetrics } from './metrics.js';

const DEFAULT_SEED = 42;

/**
 * Run a full simulation across all personas and orders.
 *
 * @param config - Simulation configuration
 * @returns Complete simulation results with sessions and aggregated metrics
 */
export async function runSimulation(config: SimulationConfig): Promise<SimulationResults> {
  const seed = config.seed ?? DEFAULT_SEED;
  const rng = createRng(seed);
  const provider = createDeterministicProvider(rng);
  const engine = new PolicyEngine(config.policy);

  const sessions: NegotiationSession[] = [];

  for (const persona of config.personas) {
    for (let i = 0; i < config.ordersPerPersona; i++) {
      const session = await runSingleSession(persona, engine, provider, rng);
      sessions.push(session);
    }
  }

  const metrics = calculateMetrics(sessions, config.policy);

  return {
    config,
    sessions,
    metrics,
    timestamp: new Date(),
  };
}

/**
 * Run a single negotiation session between a persona and the policy engine.
 *
 * The engine is passed pre-constructed; it already carries the policy, so the
 * policy is not a separate parameter.
 */
export async function runSingleSession(
  persona: BuyerPersona,
  engine: PolicyEngine,
  provider: PersonaProvider,
  rng: () => number
): Promise<NegotiationSession> {
  const rounds: NegotiationRound[] = [];
  let previousDiscount: number | null = null;
  let previousResult: import('@guardrail-sim/policy-engine').EvaluationResult | null = null;
  let lastOrder: import('@guardrail-sim/policy-engine').Order | null = null;

  // Generate a base order for this session (persona keeps same order across rounds)
  const request = provider.generateRequest({
    persona,
    roundNumber: 1,
    previousResult: null,
    previousDiscount: null,
    order: { order_value: 0, quantity: 0, product_margin: 0 },
  });

  lastOrder = request.order;

  for (let round = 1; round <= persona.maxRounds; round++) {
    // First round uses the initial request, subsequent rounds adapt
    let proposedDiscount: number;
    if (round === 1) {
      proposedDiscount = request.proposedDiscount;
    } else {
      const adapted = provider.generateRequest({
        persona,
        roundNumber: round,
        previousResult,
        previousDiscount,
        order: lastOrder,
      });
      proposedDiscount = adapted.proposedDiscount;
    }

    const evaluation = await engine.evaluate(lastOrder, proposedDiscount);

    const negotiationRound: NegotiationRound = {
      roundNumber: round,
      proposedDiscount,
      order: lastOrder,
      evaluation,
      accepted: evaluation.approved,
    };

    rounds.push(negotiationRound);

    if (evaluation.approved) {
      return buildSession(persona, rounds, 'accepted', proposedDiscount, lastOrder, rng);
    }

    // Rejected. Before conceding another round, check whether any deal exists at all:
    // if even the smallest discount this persona would accept still breaks the policy,
    // there is nothing to negotiate towards and the buyer walks away. Evaluation is
    // pure, so this probe does not disturb the RNG stream or determinism.
    const floorProbe = await engine.evaluate(lastOrder, persona.discountRange.min);
    if (!floorProbe.approved) {
      return buildSession(persona, rounds, 'abandoned', null, lastOrder, rng);
    }

    previousDiscount = proposedDiscount;
    previousResult = evaluation;
  }

  // All rounds exhausted — rejected
  return buildSession(persona, rounds, 'rejected', null, lastOrder, rng);
}

function buildSession(
  persona: BuyerPersona,
  rounds: NegotiationRound[],
  outcome: NegotiationSession['outcome'],
  finalDiscount: number | null,
  order: import('@guardrail-sim/policy-engine').Order,
  rng: () => number
): NegotiationSession {
  // Revenue actually conceded, in the order's currency units — not the discount
  // rate, which is what this field previously (mis)reported.
  const marginImpact = finalDiscount !== null ? order.order_value * finalDiscount : 0;

  return {
    id: generateSessionId(rng),
    persona,
    rounds,
    outcome,
    finalDiscount,
    marginImpact,
  };
}

function generateSessionId(rng: () => number): string {
  const hex = Math.floor(rng() * 0xffffffff)
    .toString(16)
    .padStart(8, '0');
  return `sim-${hex}`;
}
