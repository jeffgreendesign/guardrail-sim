import pkg from 'json-rules-engine';
const { Engine } = pkg;
import type { Policy, Order, EvaluationResult, Violation } from './types.js';

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

    // Collect violations from events
    const violations: Violation[] = result.events.map(
      (event: { type: string; params?: Record<string, unknown> }) => ({
        rule: (event.params?.rule as string) ?? 'unknown',
        message: (event.params?.message as string) ?? 'Policy violation',
      })
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
