import pkg from 'json-rules-engine';
const { Engine } = pkg;
import type { Policy, Order, EvaluationResult, Violation } from './types.js';
import { getUCPErrorCode } from './types.js';

/**
 * Represents a line item for allocation calculations
 */
export interface LineItem {
  id: string;
  subtotal: number;
  quantity?: number;
}

/**
 * Discount allocation to a specific target
 */
export interface Allocation {
  target: string;
  amount: number;
}

/**
 * PolicyEngine wraps json-rules-engine to evaluate orders against pricing policies.
 * All evaluation is deterministic - same inputs always produce same outputs.
 */
export class PolicyEngine {
  private engine: InstanceType<typeof Engine>;
  private policy: Policy;

  constructor(policy: Policy) {
    this.policy = policy;
    this.engine = new Engine();

    // Add each rule from the policy to the engine
    for (const rule of policy.rules) {
      this.engine.addRule({
        name: rule.name,
        conditions: rule.conditions as pkg.TopLevelCondition,
        event: rule.event,
        priority: rule.priority,
      });
    }
  }

  /**
   * Evaluate an order with a proposed discount against the policy.
   *
   * @param order - The order being evaluated
   * @param proposedDiscount - The discount being proposed (0.10 = 10%)
   * @returns EvaluationResult with approval status and any violations
   */
  async evaluate(order: Order, proposedDiscount: number): Promise<EvaluationResult> {
    // Calculate the effective margin after discount
    const calculatedMargin = order.product_margin - proposedDiscount;

    // Build facts for the rules engine
    const facts = {
      order_value: order.order_value,
      quantity: order.quantity,
      customer_segment: order.customer_segment ?? 'unknown',
      product_margin: order.product_margin,
      proposed_discount: proposedDiscount,
      calculated_margin: calculatedMargin,
    };

    // Run the engine
    const result = await this.engine.run(facts);

    // Collect violations from events with UCP error codes
    const violations: Violation[] = result.events.map(
      (event: { type: string; params?: Record<string, unknown> }) => {
        const rule = (event.params?.rule as string) ?? 'unknown';
        return {
          rule,
          message: (event.params?.message as string) ?? 'Policy violation',
          ucp_error_code: getUCPErrorCode(rule),
        };
      }
    );

    // Collect names of rules that fired
    const appliedRules = result.events.map(
      (event: { type: string; params?: Record<string, unknown> }) =>
        (event.params?.rule as string) ?? 'unknown'
    );

    return {
      approved: violations.length === 0,
      violations,
      applied_rules: appliedRules,
      calculated_margin: calculatedMargin,
    };
  }

  /**
   * Get the policy this engine is using
   */
  getPolicy(): Policy {
    return this.policy;
  }
}

/**
 * Calculate discount allocations across line items.
 * Supports UCP allocation methods: 'each' (even split) and 'across' (proportional).
 *
 * @param discountAmount - Total discount amount to allocate
 * @param lineItems - Line items to allocate across
 * @param method - Allocation method: 'each' for even split, 'across' for proportional
 * @returns Array of allocations with targets and amounts
 */
export function calculateAllocations(
  discountAmount: number,
  lineItems: LineItem[],
  method: 'each' | 'across' = 'across'
): Allocation[] {
  if (lineItems.length === 0) {
    return [{ target: '$.totals', amount: discountAmount }];
  }

  if (method === 'each') {
    // Even split across all line items
    const baseAmount = Math.floor(discountAmount / lineItems.length);
    const remainder = discountAmount - baseAmount * lineItems.length;

    return lineItems.map((item, index) => ({
      target: `$.line_items[${index}]`,
      amount: index === 0 ? baseAmount + remainder : baseAmount,
    }));
  }

  // Proportional allocation (across)
  const totalValue = lineItems.reduce((sum, item) => sum + item.subtotal, 0);

  if (totalValue === 0) {
    // Fallback to even split if no values
    return calculateAllocations(discountAmount, lineItems, 'each');
  }

  // Calculate proportional allocations with remainder handling
  const allocations: Allocation[] = [];
  let remaining = discountAmount;

  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i];
    const isLast = i === lineItems.length - 1;

    if (isLast) {
      // Last item gets the remainder to ensure exact total
      allocations.push({
        target: `$.line_items[${i}]`,
        amount: remaining,
      });
    } else {
      const proportion = item.subtotal / totalValue;
      const amount = Math.floor(discountAmount * proportion);
      remaining -= amount;

      allocations.push({
        target: `$.line_items[${i}]`,
        amount,
      });
    }
  }

  return allocations;
}

/**
 * Calculate the maximum allowable discount for an order.
 * Returns the most restrictive limit and identifies the limiting factor.
 *
 * @param order - The order to evaluate
 * @param policy - The policy to check against (default constraints if not provided)
 * @returns Object with max_discount and limiting_factor
 */
export function calculateMaxDiscount(
  order: Order,
  options: {
    marginFloor?: number;
    maxDiscount?: number;
    volumeTiers?: { minQuantity: number; maxDiscount: number }[];
  } = {}
): { max_discount: number; limiting_factor: string } {
  const {
    marginFloor = 0.15,
    maxDiscount = 0.25,
    volumeTiers = [
      { minQuantity: 0, maxDiscount: 0.1 },
      { minQuantity: 100, maxDiscount: 0.15 },
    ],
  } = options;

  // Calculate margin-based limit
  const marginLimit = order.product_margin - marginFloor;

  // Find applicable volume tier
  const applicableTier = volumeTiers
    .filter((tier) => order.quantity >= tier.minQuantity)
    .sort((a, b) => b.minQuantity - a.minQuantity)[0];
  const volumeLimit = applicableTier?.maxDiscount ?? volumeTiers[0]?.maxDiscount ?? 0.1;

  // Find the most restrictive limit
  const limits = [
    { value: maxDiscount, factor: 'max_discount' },
    { value: marginLimit, factor: 'margin_floor' },
    { value: volumeLimit, factor: 'volume_tier' },
  ];

  const mostRestrictive = limits.reduce((min, current) =>
    current.value < min.value ? current : min
  );

  return {
    max_discount: Math.max(0, mostRestrictive.value),
    limiting_factor: mostRestrictive.factor,
  };
}
