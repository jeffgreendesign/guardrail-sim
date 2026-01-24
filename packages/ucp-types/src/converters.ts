/**
 * Type converters between guardrail-sim and UCP formats
 *
 * These functions bridge the policy engine's internal types
 * with UCP-compliant request/response structures.
 */

import type { Order, EvaluationResult, Violation } from '@guardrail-sim/policy-engine';
import type {
  DiscountErrorCode,
  DiscountValidationResult,
  AppliedDiscount,
  DiscountMessage,
  DiscountExtensionResponse,
  RejectedDiscount,
} from './discount.js';
import type { LineItem, LineItemRequest, Money, Total, TotalType } from './checkout.js';

/**
 * Extract a specific total type from a totals array
 */
function getTotalAmount(totals: Total[], type: TotalType): number {
  const total = totals.find((t) => t.type === type);
  return total?.amount ?? 0;
}

/**
 * Get subtotal from line item (handles both new and legacy formats)
 */
function getLineItemSubtotal(item: LineItem | LineItemRequest): number {
  // New format: totals array
  if ('totals' in item && Array.isArray(item.totals)) {
    const subtotal = getTotalAmount(item.totals, 'subtotal');
    // Fall back to price * quantity if subtotal is missing (avoids silent zero)
    if (
      subtotal === 0 &&
      'item' in item &&
      'price' in item.item &&
      typeof item.item.price === 'number'
    ) {
      return item.item.price * item.quantity;
    }
    return subtotal;
  }
  // Legacy request format: may not have totals yet
  if ('item' in item && 'price' in item.item && typeof item.item.price === 'number') {
    return item.item.price * item.quantity;
  }
  return 0;
}

/**
 * Map guardrail-sim violation types to UCP discount error codes
 */
const VIOLATION_TO_UCP_ERROR: Record<string, DiscountErrorCode> = {
  max_discount_exceeded: 'discount_code_invalid',
  margin_floor_violated: 'discount_code_invalid',
  volume_tier_mismatch: 'discount_code_user_ineligible',
  discount_expired: 'discount_code_expired',
  discount_stacking_violation: 'discount_code_combination_disallowed',
  user_not_authenticated: 'discount_code_user_not_logged_in',
  user_ineligible: 'discount_code_user_ineligible',
  code_already_used: 'discount_code_already_applied',
};

/**
 * Convert a guardrail-sim violation to a UCP error code
 */
export function toUCPErrorCode(violation: Violation): DiscountErrorCode {
  // Check for known violation types
  const normalizedRule = violation.rule.toLowerCase().replace(/[-\s]/g, '_');

  for (const [pattern, errorCode] of Object.entries(VIOLATION_TO_UCP_ERROR)) {
    if (normalizedRule.includes(pattern)) {
      return errorCode;
    }
  }

  // Default to invalid for unknown violations
  return 'discount_code_invalid';
}

/**
 * Convert a guardrail-sim violation to a UCP discount message
 */
export function toUCPMessage(violation: Violation): DiscountMessage {
  return {
    type: 'warning',
    code: toUCPErrorCode(violation),
    message: violation.message,
  };
}

/**
 * Convert a policy evaluation result to a UCP discount validation result
 */
export function toDiscountValidationResult(
  evaluation: EvaluationResult,
  _code?: string
): DiscountValidationResult {
  if (evaluation.approved) {
    return {
      valid: true,
      message: 'Discount approved by policy',
    };
  }

  // Find the primary violation
  const primaryViolation = evaluation.violations[0];
  if (!primaryViolation) {
    return {
      valid: false,
      error_code: 'discount_code_invalid',
      message: 'Discount rejected by policy',
    };
  }

  return {
    valid: false,
    error_code: toUCPErrorCode(primaryViolation),
    message: primaryViolation.message,
    limiting_factor: primaryViolation.rule,
  };
}

/**
 * Convert a policy evaluation to UCP discount messages
 */
export function toUCPMessages(evaluation: EvaluationResult): DiscountMessage[] {
  return evaluation.violations.map(toUCPMessage);
}

/**
 * Create an applied discount from evaluation data
 */
export function createAppliedDiscount(
  code: string,
  amount: number,
  title: string,
  options: {
    method?: 'each' | 'across';
    priority?: number;
    automatic?: boolean;
    allocations?: Array<{ target: string; amount: number }>;
  } = {}
): AppliedDiscount {
  return {
    code: options.automatic ? undefined : code,
    automatic: options.automatic,
    title,
    amount,
    method: options.method ?? 'across',
    priority: options.priority ?? 1,
    allocations: options.allocations ?? [{ target: '$.totals', amount }],
  };
}

/**
 * Create a rejected discount from a violation
 */
export function createRejectedDiscount(code: string, violation: Violation): RejectedDiscount {
  return {
    code,
    error_code: toUCPErrorCode(violation),
    message: violation.message,
  };
}

/**
 * Convert UCP line items to a guardrail-sim order
 *
 * This is a simplified conversion - real implementations would
 * need more context about margins and customer segments.
 */
export function fromUCPLineItems(
  lineItems: (LineItem | LineItemRequest)[],
  options: {
    customerSegment?: string;
    productMargin?: number;
  } = {}
): Order {
  // Calculate total order value from subtotals
  const orderValue = lineItems.reduce((sum, item) => {
    return sum + getLineItemSubtotal(item);
  }, 0);

  // Calculate total quantity
  const quantity = lineItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    order_value: orderValue,
    quantity,
    customer_segment: options.customerSegment,
    product_margin: options.productMargin ?? 0.3, // Default 30% margin
  };
}

/**
 * Build a complete UCP discount extension response
 * from a policy evaluation
 */
export function buildDiscountExtensionResponse(
  codes: string[],
  evaluation: EvaluationResult,
  proposedDiscount: number,
  discountTitle: string = 'Discount'
): DiscountExtensionResponse {
  if (evaluation.approved) {
    // Discount was approved
    return {
      codes,
      applied: codes.map((code, index) =>
        createAppliedDiscount(code, proposedDiscount, discountTitle, {
          priority: index + 1,
        })
      ),
    };
  }

  // Discount was rejected
  return {
    codes,
    applied: [],
    messages: evaluation.violations.map((violation: Violation) => ({
      type: 'warning' as const,
      code: toUCPErrorCode(violation),
      message: violation.message,
      field: 'dev.ucp.shopping.discount.codes',
    })),
  };
}

/**
 * Calculate discount allocations across line items
 *
 * @param discountAmount - Total discount amount
 * @param lineItems - Line items to allocate across
 * @param method - 'each' for per-item, 'across' for proportional
 */
export function calculateAllocations(
  discountAmount: number,
  lineItems: (LineItem | LineItemRequest)[],
  method: 'each' | 'across' = 'across'
): Array<{ target: string; amount: number }> {
  if (lineItems.length === 0) {
    return [{ target: '$.totals', amount: discountAmount }];
  }

  if (method === 'each') {
    // Split evenly across items
    const perItem = Math.floor(discountAmount / lineItems.length);
    const remainder = discountAmount - perItem * lineItems.length;

    return lineItems.map((_, index) => ({
      target: `$.line_items[${index}]`,
      amount: index === 0 ? perItem + remainder : perItem,
    }));
  }

  // Proportional allocation based on subtotals
  const totalValue = lineItems.reduce((sum, item) => sum + getLineItemSubtotal(item), 0);

  if (totalValue === 0) {
    // Fallback to even split if no subtotals
    return calculateAllocations(discountAmount, lineItems, 'each');
  }

  let allocated = 0;
  const allocations = lineItems.map((item, index) => {
    const itemValue = getLineItemSubtotal(item);
    const proportion = itemValue / totalValue;
    const itemDiscount =
      index === lineItems.length - 1
        ? discountAmount - allocated // Last item gets remainder
        : Math.round(discountAmount * proportion);

    allocated += itemDiscount;

    return {
      target: `$.line_items[${index}]`,
      amount: itemDiscount,
    };
  });

  return allocations;
}

/**
 * Format a money amount for display
 */
export function formatMoney(money: Money): string {
  const amount = money.amount / 100; // Assuming minor units
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currency,
  }).format(amount);
}
