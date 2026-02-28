/**
 * @guardrail-sim/simulation
 *
 * Adversarial buyer persona simulation engine for stress-testing pricing policies.
 * Runs deterministic negotiation loops against the policy engine.
 */

export { runSimulation, runSingleSession } from './runner.js';
export {
  defaultPersonas,
  budgetBuyer,
  strategicBuyer,
  marginHunter,
  volumeGamer,
  codeStacker,
  createDeterministicProvider,
} from './personas.js';
export { calculateMetrics } from './metrics.js';
export { toSimulationSummary } from './insights-bridge.js';
export { createRng, randomInRange, randomInt } from './rng.js';
export {
  generateVolumeBoundaryOrders,
  generateMarginFloorProbes,
  generateMaxDiscountProbes,
  createBoundaryProber,
} from './edge-cases.js';
export type {
  BuyerPersona,
  PersonaStrategy,
  PersonaProvider,
  NegotiationContext,
  DiscountRequest,
  NegotiationSession,
  NegotiationRound,
  SessionOutcome,
  SimulationConfig,
  SimulationResults,
  SimulationMetrics,
  EdgeCase,
} from './types.js';
