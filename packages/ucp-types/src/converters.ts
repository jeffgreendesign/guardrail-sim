/**
 * Type converters between guardrail-sim and UCP formats
 *
 * These functions bridge the policy engine's internal types
 * with UCP-compliant request/response structures.
 */

import type { Order, EvaluationResult, Violation } from '@guardrail-sim/policy-engine';
import { getUCPErrorCode } from '@guardrail-sim/policy-engine';
import type {
  DiscountErrorCode,
  DiscountValidationResult,
  AppliedDiscount,
  DiscountMessage,
  DiscountExtensionResponse,
  RejectedDiscount,
} from './discount.js';
import type { LineItem, LineItemRequest, Money, CreateCheckoutRequest } from './checkout.js';
import type { CartResponse } from './cart.js';

/**
 * Get subtotal from line item (handles both new and legacy formats)
 */
function getLineItemSubtotal(item: LineItem | LineItemRequest): number {
  // New format: totals array
  if ('totals' in item && Array.isArray(item.totals)) {
    const subtotalEntry = item.totals.find((t) => t.type === 'subtotal');
    if (subtotalEntry !== undefined) {
      return subtotalEntry.amount;
    }
    // Fall back to price * quantity if subtotal entry is missing
    if ('item' in item && 'price' in item.item && typeof item.item.price === 'number') {
      return item.item.price * item.quantity;
    }
    return 0;
  }
  // Legacy request format: may not have totals yet
  if ('item' in item && 'price' in item.item && typeof item.item.price === 'number') {
    return item.item.price * item.quantity;
  }
  return 0;
}

/**
 * Convert a guardrail-sim violation to a UCP error code.
 * Delegates to the canonical mapping in @guardrail-sim/policy-engine.
 */
export function toUCPErrorCode(violation: Violation): DiscountErrorCode {
  return getUCPErrorCode(violation.rule);
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
  code?: string
): DiscountValidationResult {
  // The code is echoed back on the result so callers do not have to re-attach it.
  const withCode = code !== undefined ? { code } : {};

  if (evaluation.approved) {
    return {
      ...withCode,
      valid: true,
      message: 'Discount approved by policy',
    };
  }

  // Find the primary violation
  const primaryViolation = evaluation.violations[0];
  if (!primaryViolation) {
    return {
      ...withCode,
      valid: false,
      error_code: 'discount_code_invalid',
      message: 'Discount rejected by policy',
    };
  }

  return {
    ...withCode,
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
 * The margin assumed when a caller supplies none.
 *
 * A UCP line item carries price but not cost, so margin cannot be derived from
 * the cart alone. This is an assumption, not a measurement — exported so callers
 * can see the number they are inheriting and override it deliberately.
 */
export const DEFAULT_PRODUCT_MARGIN = 0.3;

/**
 * Convert UCP line items to a guardrail-sim order.
 *
 * Margin is not present in UCP line items; pass `productMargin` whenever you know
 * it, or the order is evaluated against {@link DEFAULT_PRODUCT_MARGIN}.
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
    product_margin: options.productMargin ?? DEFAULT_PRODUCT_MARGIN,
  };
}

/**
 * Split an integer amount into `count` parts that sum exactly to the original.
 * The remainder goes to the first part, matching the `each` allocation convention.
 */
function splitEvenly(amount: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(amount / count);
  const remainder = amount - base * count;
  return Array.from({ length: count }, (_, i) => (i === 0 ? base + remainder : base));
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
    // `proposedDiscount` is the total for the basket, so it is SPLIT across the codes
    // rather than granted to each one. Giving every code the full amount meant N codes
    // produced N times the discount; the sum is what lands in the checkout's totals[],
    // so eleven codes could drive the order total below zero.
    const perCode = splitEvenly(proposedDiscount, codes.length);
    return {
      codes,
      applied: codes.map((code, index) =>
        createAppliedDiscount(code, perCode[index] ?? 0, discountTitle, {
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
 * Convert a UCP cart to a guardrail-sim order for policy evaluation
 */
export function fromUCPCartToOrder(
  cart: CartResponse,
  options: {
    customerSegment?: string;
    productMargin?: number;
  } = {}
): Order {
  const orderValue = cart.line_items.reduce((sum, li) => sum + li.item.price * li.quantity, 0);
  const quantity = cart.line_items.reduce((sum, li) => sum + li.quantity, 0);

  return {
    order_value: orderValue,
    quantity,
    customer_segment: options.customerSegment,
    product_margin: options.productMargin ?? 0.3,
  };
}

/**
 * Convert a UCP cart to a create checkout request
 */
export function toCheckoutFromCart(cart: CartResponse): CreateCheckoutRequest {
  return {
    currency: cart.currency,
    line_items: cart.line_items.map((li) => ({
      item: li.item,
      quantity: li.quantity,
    })),
  };
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
