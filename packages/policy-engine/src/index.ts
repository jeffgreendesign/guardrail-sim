/**
 * @guardrail-sim/policy-engine
 *
 * Deterministic policy evaluation engine for AI agent pricing governance.
 * Uses json-rules-engine for rule processing.
 */

export { PolicyEngine } from './engine.js';
export { defaultPolicy } from './policies/default.js';
export type {
  Order,
  Policy,
  PolicyRule,
  RuleCondition,
  FactCondition,
  NestedCondition,
  EvaluationResult,
  Violation,
} from './types.js';
