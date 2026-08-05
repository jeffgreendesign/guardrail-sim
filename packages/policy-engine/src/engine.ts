import pkg from 'json-rules-engine';
const { Engine } = pkg;
import type { Policy, Order, EvaluationResult, Violation } from './types.js';
import { getUCPErrorCode } from './types.js';
import type { PolicyThresholds, VolumeTier } from './thresholds.js';
import { extractPolicyThresholds, volumeTierLimit } from './thresholds.js';

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

    type RuleEvent = { type: string; params?: Record<string, unknown> };
    const ruleNameOf = (event: RuleEvent): string => (event.params?.rule as string) ?? 'unknown';

    // Only events explicitly typed as violations block approval. Any other event type
    // is informational, so a policy can carry advisory rules without failing the order.
    const violations: Violation[] = (result.events as RuleEvent[])
      .filter((event) => event.type === 'violation')
      .map((event) => {
        const rule = ruleNameOf(event);
        return {
          rule,
          message: (event.params?.message as string) ?? 'Policy violation',
          ucp_error_code: getUCPErrorCode(rule),
        };
      });

    const notices: Violation[] = (result.events as RuleEvent[])
      .filter((event) => event.type !== 'violation')
      .map((event) => ({
        rule: ruleNameOf(event),
        message: (event.params?.message as string) ?? 'Policy notice',
      }));

    // Every rule the engine reached a verdict on, whether or not it fired.
    // `failureEvents` carries the rules that did NOT match, which is what makes this
    // "rules evaluated" rather than a duplicate of the violation list.
    const appliedRules = [
      ...(result.events as RuleEvent[]),
      ...((result.failureEvents ?? []) as RuleEvent[]),
    ].map(ruleNameOf);

    return {
      approved: violations.length === 0,
      violations,
      ...(notices.length > 0 && { notices }),
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
 * Explicit threshold overrides for {@link calculateMaxDiscount}.
 */
export interface MaxDiscountOptions {
  marginFloor?: number;
  maxDiscount?: number;
  volumeTiers?: VolumeTier[];
}

function isPolicy(value: Policy | MaxDiscountOptions): value is Policy {
  return 'rules' in value && Array.isArray((value as Policy).rules);
}

/**
 * Calculate the maximum allowable discount for an order.
 * Returns the most restrictive limit and identifies the limiting factor.
 *
 * Pass the `Policy` the order will actually be evaluated against — the thresholds
 * are then read from that policy's rules via {@link extractPolicyThresholds}, so a
 * custom policy is never answered with another policy's numbers. Passing explicit
 * options instead is supported for callers that have thresholds but no Policy object.
 *
 * When a policy states no recognizable limit on any dimension, this returns
 * `max_discount: 0` with `limiting_factor: 'undetermined'` rather than guessing —
 * an unverifiable guardrail is reported as no headroom, not as unlimited headroom.
 *
 * @param order - The order to evaluate
 * @param policyOrOptions - The policy to check against, or explicit threshold overrides
 * @returns Object with max_discount and limiting_factor
 */
export function calculateMaxDiscount(
  order: Order,
  policyOrOptions: Policy | MaxDiscountOptions = {}
): { max_discount: number; limiting_factor: string } {
  const thresholds: PolicyThresholds = isPolicy(policyOrOptions)
    ? extractPolicyThresholds(policyOrOptions)
    : {
        ...(policyOrOptions.marginFloor !== undefined && {
          marginFloor: policyOrOptions.marginFloor,
        }),
        ...(policyOrOptions.maxDiscount !== undefined && {
          maxDiscount: policyOrOptions.maxDiscount,
        }),
        volumeTiers: policyOrOptions.volumeTiers ?? [],
      };

  // Only consider dimensions the policy (or the caller) actually constrained.
  const limits: { value: number; factor: string }[] = [];

  if (thresholds.maxDiscount !== undefined) {
    limits.push({ value: thresholds.maxDiscount, factor: 'max_discount' });
  }

  if (thresholds.marginFloor !== undefined) {
    limits.push({ value: order.product_margin - thresholds.marginFloor, factor: 'margin_floor' });
  }

  const volumeLimit = volumeTierLimit(thresholds.volumeTiers, order.quantity);
  if (volumeLimit !== undefined) {
    limits.push({ value: volumeLimit, factor: 'volume_tier' });
  }

  if (limits.length === 0) {
    return { max_discount: 0, limiting_factor: 'undetermined' };
  }

  const mostRestrictive = limits.reduce((min, current) =>
    current.value < min.value ? current : min
  );

  return {
    max_discount: Math.max(0, mostRestrictive.value),
    limiting_factor: mostRestrictive.factor,
  };
}
