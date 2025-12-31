/**
 * Type definitions for the policy engine
 */

/**
 * Represents a B2B order for policy evaluation
 */
export interface Order {
  order_value: number;
  quantity: number;
  customer_segment?: string;
  product_margin: number;
}

/**
 * A single rule in a policy, wrapping json-rules-engine format
 */
export interface PolicyRule {
  name: string;
  conditions: {
    all?: RuleCondition[];
    any?: RuleCondition[];
  };
  event: {
    type: string;
    params?: Record<string, unknown>;
  };
  priority?: number;
}

/**
 * A leaf condition that checks a specific fact
 */
export interface FactCondition {
  fact: string;
  operator: string;
  value: unknown;
}

/**
 * A nested condition that combines other conditions
 */
export interface NestedCondition {
  all?: RuleCondition[];
  any?: RuleCondition[];
}

/**
 * A condition within a rule - either a fact check or nested conditions
 */
export type RuleCondition = FactCondition | NestedCondition;

/**
 * A policy containing multiple rules
 */
export interface Policy {
  id: string;
  name: string;
  rules: PolicyRule[];
}

/**
 * A violation that occurred during policy evaluation
 */
export interface Violation {
  rule: string;
  message: string;
}

/**
 * Result of evaluating an order against a policy
 */
export interface EvaluationResult {
  approved: boolean;
  violations: Violation[];
  applied_rules: string[];
  calculated_margin: number;
}
