/**
 * Built-in buyer personas for simulation.
 *
 * Each persona has a deterministic strategy that generates discount requests
 * based on its configuration and previous negotiation results.
 */

import type { Order, EvaluationResult } from '@guardrail-sim/policy-engine';
import type {
  BuyerPersona,
  PersonaProvider,
  NegotiationContext,
  DiscountRequest,
} from './types.js';
import { randomInRange, randomInt } from './rng.js';

// ============================================================================
// BUILT-IN PERSONAS
// ============================================================================

export const budgetBuyer: BuyerPersona = {
  id: 'budget-buyer',
  name: 'Budget Buyer',
  strategy: 'cooperative',
  discountRange: { min: 0.03, max: 0.08 },
  volumeRange: { min: 10, max: 80 },
  marginRange: { min: 0.3, max: 0.5 },
  maxRounds: 2,
  adaptationRate: 0.5,
};

export const strategicBuyer: BuyerPersona = {
  id: 'strategic-buyer',
  name: 'Strategic Buyer',
  strategy: 'strategic',
  discountRange: { min: 0.08, max: 0.18 },
  volumeRange: { min: 50, max: 200 },
  marginRange: { min: 0.25, max: 0.45 },
  maxRounds: 4,
  adaptationRate: 0.3,
};

export const marginHunter: BuyerPersona = {
  id: 'margin-hunter',
  name: 'Margin Hunter',
  strategy: 'adversarial',
  discountRange: { min: 0.12, max: 0.25 },
  volumeRange: { min: 20, max: 150 },
  marginRange: { min: 0.18, max: 0.35 },
  maxRounds: 5,
  adaptationRate: 0.15,
};

export const volumeGamer: BuyerPersona = {
  id: 'volume-gamer',
  name: 'Volume Gamer',
  strategy: 'adversarial',
  discountRange: { min: 0.1, max: 0.16 },
  volumeRange: { min: 90, max: 110 },
  marginRange: { min: 0.3, max: 0.45 },
  maxRounds: 4,
  adaptationRate: 0.2,
};

export const codeStacker: BuyerPersona = {
  id: 'code-stacker',
  name: 'Code Stacker',
  strategy: 'adversarial',
  discountRange: { min: 0.2, max: 0.3 },
  volumeRange: { min: 30, max: 120 },
  marginRange: { min: 0.35, max: 0.55 },
  maxRounds: 3,
  adaptationRate: 0.1,
};

/** All built-in personas */
export const defaultPersonas: BuyerPersona[] = [
  budgetBuyer,
  strategicBuyer,
  marginHunter,
  volumeGamer,
  codeStacker,
];

// ============================================================================
// DETERMINISTIC PERSONA PROVIDER
// ============================================================================

/**
 * Creates a deterministic persona provider that uses seeded RNG.
 * Strategies vary by persona type:
 *
 * - cooperative: requests modest discounts, backs off quickly on rejection
 * - strategic: starts high, negotiates down incrementally
 * - adversarial: probes boundaries, minimal concession on rejection
 */
export function createDeterministicProvider(rng: () => number): PersonaProvider {
  return {
    generateRequest(context: NegotiationContext): DiscountRequest {
      const { persona, roundNumber, previousResult, previousDiscount } = context;

      const order = generateOrder(persona, rng);
      const proposedDiscount = generateDiscount(
        persona,
        roundNumber,
        previousResult,
        previousDiscount,
        rng
      );

      return { proposedDiscount, order };
    },
  };
}

/**
 * Generate an order based on persona configuration
 */
function generateOrder(persona: BuyerPersona, rng: () => number): Order {
  const quantity = Math.round(randomInRange(rng, persona.volumeRange.min, persona.volumeRange.max));
  const margin = roundTo(randomInRange(rng, persona.marginRange.min, persona.marginRange.max), 2);
  const orderValue = randomInt(rng, 500, 20000);

  return {
    order_value: orderValue,
    quantity,
    product_margin: margin,
    customer_segment: pickSegment(rng),
  };
}

/**
 * Generate a discount proposal based on persona strategy and negotiation state
 */
function generateDiscount(
  persona: BuyerPersona,
  roundNumber: number,
  previousResult: EvaluationResult | null,
  previousDiscount: number | null,
  rng: () => number
): number {
  const { discountRange, strategy, adaptationRate } = persona;

  // First round: generate initial request based on strategy
  if (roundNumber === 1 || previousResult === null || previousDiscount === null) {
    return roundTo(generateInitialDiscount(strategy, discountRange, rng), 4);
  }

  // Subsequent rounds: adapt based on previous result
  if (previousResult.approved) {
    // Already approved — try pushing slightly higher
    const bump = rng() * 0.02;
    return roundTo(Math.min(previousDiscount + bump, discountRange.max), 4);
  }

  // Rejected — adjust strategy
  return roundTo(
    adaptAfterRejection(strategy, previousDiscount, adaptationRate, discountRange, rng),
    4
  );
}

function generateInitialDiscount(
  strategy: BuyerPersona['strategy'],
  range: BuyerPersona['discountRange'],
  rng: () => number
): number {
  switch (strategy) {
    case 'cooperative':
      // Start low — bottom 40% of range
      return randomInRange(rng, range.min, range.min + (range.max - range.min) * 0.4);
    case 'strategic':
      // Start in the middle-high — 50-80% of range
      return randomInRange(
        rng,
        range.min + (range.max - range.min) * 0.5,
        range.min + (range.max - range.min) * 0.8
      );
    case 'adversarial':
      // Start high — top 30% of range
      return randomInRange(rng, range.min + (range.max - range.min) * 0.7, range.max);
  }
}

function adaptAfterRejection(
  strategy: BuyerPersona['strategy'],
  previousDiscount: number,
  adaptationRate: number,
  range: BuyerPersona['discountRange'],
  rng: () => number
): number {
  switch (strategy) {
    case 'cooperative':
      // Large drop — concede quickly
      return Math.max(
        range.min,
        previousDiscount - previousDiscount * adaptationRate * (0.8 + rng() * 0.4)
      );
    case 'strategic':
      // Moderate drop — gradual concession
      return Math.max(
        range.min,
        previousDiscount - previousDiscount * adaptationRate * (0.3 + rng() * 0.4)
      );
    case 'adversarial':
      // Minimal drop — barely budge
      return Math.max(
        range.min,
        previousDiscount - previousDiscount * adaptationRate * (0.1 + rng() * 0.2)
      );
  }
}

const SEGMENTS = ['bronze', 'silver', 'gold', 'platinum', 'new'] as const;
const SEGMENT_WEIGHTS = [0.3, 0.3, 0.2, 0.1, 0.1];

function pickSegment(rng: () => number): string {
  const roll = rng();
  let cumulative = 0;
  for (let i = 0; i < SEGMENTS.length; i++) {
    cumulative += SEGMENT_WEIGHTS[i];
    if (roll < cumulative) return SEGMENTS[i];
  }
  return SEGMENTS[0];
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
