/**
 * UCP Discount Extension Types
 *
 * Based on the Universal Commerce Protocol specification.
 * See: https://ucp.dev/specification/discount
 *
 * The Discount Extension enables platforms to submit discount codes
 * and receive applied discounts with allocations.
 */

/**
 * Discount allocation method
 * - 'each': Discount applied per-item
 * - 'across': Discount distributed proportionally across items
 */
export type DiscountMethod = 'each' | 'across';

/**
 * Standard UCP discount error codes
 * Used when discount codes are rejected during checkout
 */
export type DiscountErrorCode =
  | 'discount_code_expired'
  | 'discount_code_invalid'
  | 'discount_code_already_applied'
  | 'discount_code_combination_disallowed'
  | 'discount_code_user_not_logged_in'
  | 'discount_code_user_ineligible';

/**
 * Allocation of a discount to a specific target
 * Target uses JSONPath format (e.g., $.line_items[0], $.totals.shipping)
 */
export interface DiscountAllocation {
  /** JSONPath to the target (line item, shipping, fee) */
  target: string;
  /** Amount allocated to this target in minor currency units */
  amount: number;
}

/**
 * A successfully applied discount
 */
export interface AppliedDiscount {
  /** The discount code (absent for automatic discounts) */
  code?: string;
  /** True if this discount was automatically applied */
  automatic?: boolean;
  /** Human-readable description of the discount */
  title: string;
  /** Total discount amount in minor currency units */
  amount: number;
  /** How the discount is distributed */
  method: DiscountMethod;
  /** Stacking priority (lower = applied first) */
  priority: number;
  /** Breakdown of discount allocation by target */
  allocations: DiscountAllocation[];
}

/**
 * A rejected discount code with reason
 */
export interface RejectedDiscount {
  /** The discount code that was rejected */
  code: string;
  /** UCP standard error code */
  error_code: DiscountErrorCode;
  /** Human-readable error message */
  message: string;
}

/**
 * UCP Discount Extension for checkout requests
 * Used when submitting discount codes
 */
export interface DiscountRequest {
  /** Array of discount codes to apply (case-insensitive) */
  codes: string[];
}

/**
 * UCP Discount Extension for checkout responses
 * Contains applied discounts and any rejection messages
 */
export interface DiscountResponse {
  /** Submitted discount codes */
  codes: string[];
  /** Successfully applied discounts */
  applied: AppliedDiscount[];
}

/**
 * Message severity levels in UCP responses
 */
export type MessageSeverity = 'recoverable' | 'requires_buyer_input' | 'requires_buyer_review';

/**
 * Message type for discount-related messages
 */
export type DiscountMessageType = 'warning' | 'error' | 'info';

/**
 * A message in the UCP response (used for rejected codes)
 */
export interface DiscountMessage {
  /** Message type */
  type: DiscountMessageType;
  /** UCP error code */
  code: DiscountErrorCode;
  /** Human-readable message */
  message: string;
  /** Path to the field that caused the error */
  field?: string;
}

/**
 * Complete discount extension response with messages
 */
export interface DiscountExtensionResponse extends DiscountResponse {
  /** Messages about rejected codes or warnings */
  messages?: DiscountMessage[];
}

/**
 * Guardrail-sim specific: Policy validation result for a discount
 */
export interface DiscountValidationResult {
  /** Whether the discount is allowed by policy */
  valid: boolean;
  /** UCP error code if rejected */
  error_code?: DiscountErrorCode;
  /** Human-readable explanation */
  message?: string;
  /** Maximum allowed discount for this order */
  max_allowed?: number;
  /** Limiting factor (which rule capped the discount) */
  limiting_factor?: string;
}
