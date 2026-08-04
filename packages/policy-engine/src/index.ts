/**
 * @guardrail-sim/policy-engine
 *
 * Deterministic policy evaluation engine for AI agent pricing governance.
 * Uses json-rules-engine for rule processing.
 */

export { PolicyEngine, calculateAllocations, calculateMaxDiscount } from './engine.js';
export type { LineItem, Allocation, MaxDiscountOptions } from './engine.js';
export { extractPolicyThresholds, volumeTierLimit, classifyPolicyRuleNames } from './thresholds.js';
export type { PolicyThresholds, VolumeTier, PolicyRuleNames } from './thresholds.js';
export { defaultPolicy } from './policies/default.js';
export { getUCPErrorCode, VIOLATION_TO_UCP_ERROR } from './types.js';
export type {
  Order,
  Policy,
  PolicyRule,
  RuleCondition,
  FactCondition,
  NestedCondition,
  EvaluationResult,
  Violation,
  UCPErrorCode,
} from './types.js';
