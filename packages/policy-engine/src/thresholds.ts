import type { FactCondition, Policy, PolicyRule, RuleCondition } from './types.js';

/**
 * A volume-based discount tier: orders of at least `minQuantity` units
 * may be discounted up to `maxDiscount`.
 */
export interface VolumeTier {
  minQuantity: number;
  maxDiscount: number;
}

/**
 * The numeric guardrails a policy expresses, recovered from its rule conditions.
 *
 * Any field may be absent: a policy is not required to constrain every dimension,
 * and callers must not substitute a default for a limit the policy never stated.
 */
export interface PolicyThresholds {
  /** Minimum acceptable margin after discount, e.g. 0.15 for a 15% floor. */
  marginFloor?: number;
  /** Absolute discount cap, e.g. 0.25 for 25%. */
  maxDiscount?: number;
  /** Volume tiers, ascending by minQuantity. Empty when the policy has no volume rules. */
  volumeTiers: VolumeTier[];
}

/** Operators meaning "violation when the fact is below this value". */
const BELOW_OPERATORS = new Set(['lessThan', 'lessThanInclusive']);

/** Operators meaning "violation when the fact is above this value". */
const ABOVE_OPERATORS = new Set(['greaterThan', 'greaterThanInclusive']);

function isFactCondition(condition: RuleCondition): condition is FactCondition {
  return 'fact' in condition;
}

/**
 * Flatten a condition tree into its leaf fact conditions, regardless of all/any nesting.
 */
function collectFacts(conditions: RuleCondition[] | undefined): FactCondition[] {
  if (!conditions) return [];

  const facts: FactCondition[] = [];
  for (const condition of conditions) {
    if (isFactCondition(condition)) {
      facts.push(condition);
    } else {
      facts.push(...collectFacts(condition.all), ...collectFacts(condition.any));
    }
  }
  return facts;
}

/** All leaf fact conditions in a rule, from both the `all` and `any` branches. */
function ruleFacts(rule: PolicyRule): FactCondition[] {
  return [...collectFacts(rule.conditions.all), ...collectFacts(rule.conditions.any)];
}

function numericValue(condition: FactCondition): number | undefined {
  return typeof condition.value === 'number' ? condition.value : undefined;
}

/**
 * Recover the volume tiers encoded by a rule of the shape used by `defaultPolicy`:
 *
 *   all: [ proposed_discount > BASE,
 *          any: [ quantity < THRESHOLD, proposed_discount > TIER ] ]
 *
 * which reads "violation when the discount exceeds BASE and either the order is
 * below THRESHOLD units or the discount also exceeds TIER" — i.e. BASE applies
 * below THRESHOLD units and TIER applies at or above it.
 */
function extractVolumeTiers(rule: PolicyRule): VolumeTier[] {
  const topLevel = collectFacts(rule.conditions.all).filter((c) => !('any' in c));
  const base = topLevel.find(
    (c) => c.fact === 'proposed_discount' && ABOVE_OPERATORS.has(c.operator)
  );
  const baseValue = base ? numericValue(base) : undefined;

  const tiers: VolumeTier[] = [];
  if (baseValue !== undefined) {
    tiers.push({ minQuantity: 0, maxDiscount: baseValue });
  }

  // Each nested `any` block pairs a quantity threshold with the discount allowed above it.
  for (const condition of rule.conditions.all ?? []) {
    if (isFactCondition(condition)) continue;

    const nested = collectFacts(condition.any);
    const quantityBound = nested.find(
      (c) => c.fact === 'quantity' && BELOW_OPERATORS.has(c.operator)
    );
    const tierDiscount = nested.find(
      (c) => c.fact === 'proposed_discount' && ABOVE_OPERATORS.has(c.operator)
    );

    const threshold = quantityBound ? numericValue(quantityBound) : undefined;
    const allowed = tierDiscount ? numericValue(tierDiscount) : undefined;
    if (threshold !== undefined && allowed !== undefined) {
      tiers.push({ minQuantity: threshold, maxDiscount: allowed });
    }
  }

  return tiers.sort((a, b) => a.minQuantity - b.minQuantity);
}

/**
 * Recover the numeric guardrails a policy expresses by reading its rule conditions.
 *
 * This is the single source of truth for "what does this policy actually allow".
 * `calculateMaxDiscount` and the simulation's edge-case detection both read it, so
 * a custom policy is never silently evaluated against default-policy numbers.
 *
 * Rules are classified by the facts they reference:
 * - references `quantity`      -> volume tier rule
 * - references `calculated_margin` -> margin floor rule
 * - references `proposed_discount` -> absolute discount cap
 *
 * Rules that match none of these shapes are ignored; the corresponding threshold
 * stays `undefined` rather than falling back to a guess.
 */
export function extractPolicyThresholds(policy: Policy): PolicyThresholds {
  const thresholds: PolicyThresholds = { volumeTiers: [] };

  for (const rule of policy.rules) {
    const facts = ruleFacts(rule);
    if (facts.length === 0) continue;

    if (facts.some((c) => c.fact === 'quantity')) {
      const tiers = extractVolumeTiers(rule);
      if (tiers.length > 0) {
        thresholds.volumeTiers = tiers;
      }
      continue;
    }

    const marginCondition = facts.find(
      (c) => c.fact === 'calculated_margin' && BELOW_OPERATORS.has(c.operator)
    );
    if (marginCondition) {
      const value = numericValue(marginCondition);
      if (value !== undefined) {
        // Most restrictive floor wins when several rules constrain margin.
        thresholds.marginFloor =
          thresholds.marginFloor === undefined ? value : Math.max(thresholds.marginFloor, value);
      }
      continue;
    }

    const discountCondition = facts.find(
      (c) => c.fact === 'proposed_discount' && ABOVE_OPERATORS.has(c.operator)
    );
    if (discountCondition) {
      const value = numericValue(discountCondition);
      if (value !== undefined) {
        // Most restrictive cap wins when several rules cap the discount.
        thresholds.maxDiscount =
          thresholds.maxDiscount === undefined ? value : Math.min(thresholds.maxDiscount, value);
      }
    }
  }

  return thresholds;
}

/**
 * The discount allowed at a given quantity, or undefined when the policy has no volume tiers.
 */
export function volumeTierLimit(tiers: VolumeTier[], quantity: number): number | undefined {
  const applicable = tiers
    .filter((tier) => quantity >= tier.minQuantity)
    .sort((a, b) => b.minQuantity - a.minQuantity)[0];

  return applicable?.maxDiscount;
}
