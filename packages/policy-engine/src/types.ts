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
 * UCP-compatible error codes for discount validation
 * @see https://ucp.dev/spec/discount
 */
export type UCPErrorCode =
  | 'discount_code_expired'
  | 'discount_code_invalid'
  | 'discount_code_already_applied'
  | 'discount_code_combination_disallowed'
  | 'discount_code_user_not_logged_in'
  | 'discount_code_user_ineligible';

/**
 * Maps policy engine violation rules to UCP error codes
 */
export const VIOLATION_TO_UCP_ERROR: Record<string, UCPErrorCode> = {
  // Discount value violations
  max_discount: 'discount_code_invalid',
  max_discount_exceeded: 'discount_code_invalid',
  margin_floor: 'discount_code_invalid',
  margin_floor_violated: 'discount_code_invalid',

  // Eligibility violations
  volume_tier: 'discount_code_user_ineligible',
  volume_tier_mismatch: 'discount_code_user_ineligible',
  customer_segment_mismatch: 'discount_code_user_ineligible',

  // Combination violations
  stacking_not_allowed: 'discount_code_combination_disallowed',
  exclusive_discount: 'discount_code_combination_disallowed',

  // Temporal violations
  discount_expired: 'discount_code_expired',
  discount_not_started: 'discount_code_expired',

  // Auth violations
  login_required: 'discount_code_user_not_logged_in',
};

/**
 * Get the UCP error code for a violation rule
 */
export function getUCPErrorCode(violationRule: string): UCPErrorCode {
  return VIOLATION_TO_UCP_ERROR[violationRule] ?? 'discount_code_invalid';
}

/**
 * A violation that occurred during policy evaluation
 */
export interface Violation {
  rule: string;
  message: string;
  /** UCP-compatible error code */
  ucp_error_code?: UCPErrorCode;
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
