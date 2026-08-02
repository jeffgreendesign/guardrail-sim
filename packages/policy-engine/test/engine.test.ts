import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  PolicyEngine,
  defaultPolicy,
  calculateAllocations,
  calculateMaxDiscount,
  extractPolicyThresholds,
  getUCPErrorCode,
  volumeTierLimit,
} from '../dist/index.js';
import type { Order, LineItem, Policy } from '../dist/index.js';

describe('PolicyEngine', () => {
  describe('with default policy', () => {
    it('approves discount within limits', async () => {
      const engine = new PolicyEngine(defaultPolicy);
      const order: Order = {
        order_value: 1000,
        quantity: 50,
        product_margin: 0.4, // 40% margin
        customer_segment: 'gold',
      };

      // 8% discount is within 10% base limit
      const result = await engine.evaluate(order, 0.08);

      assert.strictEqual(result.approved, true);
      assert.strictEqual(result.violations.length, 0);
      assert.strictEqual(result.calculated_margin, 0.32); // 40% - 8% = 32%
    });

    it('rejects discount exceeding max', async () => {
      const engine = new PolicyEngine(defaultPolicy);
      const order: Order = {
        order_value: 5000,
        quantity: 200,
        product_margin: 0.5, // 50% margin
        customer_segment: 'platinum',
      };

      // 30% discount exceeds 25% max
      const result = await engine.evaluate(order, 0.3);

      assert.strictEqual(result.approved, false);
      assert.ok(result.violations.some((v) => v.rule === 'max_discount'));
    });

    it('rejects discount violating margin floor', async () => {
      const engine = new PolicyEngine(defaultPolicy);
      const order: Order = {
        order_value: 2000,
        quantity: 100,
        product_margin: 0.2, // 20% margin - low!
        customer_segment: 'silver',
      };

      // 10% discount would leave only 10% margin (below 15% floor)
      const result = await engine.evaluate(order, 0.1);

      assert.strictEqual(result.approved, false);
      assert.ok(result.violations.some((v) => v.rule === 'margin_floor'));
      assert.strictEqual(result.calculated_margin, 0.1); // 20% - 10% = 10%
    });

    it('volume tier unlocks higher discount', async () => {
      const engine = new PolicyEngine(defaultPolicy);
      const order: Order = {
        order_value: 10000,
        quantity: 100, // Qualifies for volume tier
        product_margin: 0.4,
        customer_segment: 'gold',
      };

      // 12% discount exceeds 10% base but is within 15% volume tier limit
      const result = await engine.evaluate(order, 0.12);

      assert.strictEqual(result.approved, true);
      assert.strictEqual(result.violations.length, 0);
      assert.strictEqual(result.calculated_margin, 0.28); // 40% - 12% = 28%
    });

    it('rejects 12% discount without volume tier', async () => {
      const engine = new PolicyEngine(defaultPolicy);
      const order: Order = {
        order_value: 1000,
        quantity: 50, // Does NOT qualify for volume tier
        product_margin: 0.4,
        customer_segment: 'bronze',
      };

      // 12% discount exceeds 10% base and qty < 100
      const result = await engine.evaluate(order, 0.12);

      assert.strictEqual(result.approved, false);
      assert.ok(result.violations.some((v) => v.rule === 'volume_tier'));
    });

    it('approves 15% discount at volume tier limit', async () => {
      const engine = new PolicyEngine(defaultPolicy);
      const order: Order = {
        order_value: 15000,
        quantity: 150, // Volume tier
        product_margin: 0.45,
        customer_segment: 'platinum',
      };

      // 15% is exactly at volume tier limit
      const result = await engine.evaluate(order, 0.15);

      assert.strictEqual(result.approved, true);
      assert.strictEqual(result.violations.length, 0);
    });

    it('rejects 16% discount even with volume tier', async () => {
      const engine = new PolicyEngine(defaultPolicy);
      const order: Order = {
        order_value: 20000,
        quantity: 200, // Volume tier
        product_margin: 0.5,
        customer_segment: 'platinum',
      };

      // 16% exceeds 15% volume tier limit
      const result = await engine.evaluate(order, 0.16);

      assert.strictEqual(result.approved, false);
      assert.ok(result.violations.some((v) => v.rule === 'volume_tier'));
    });

    it('returns applied rules in result', async () => {
      const engine = new PolicyEngine(defaultPolicy);
      const order: Order = {
        order_value: 1000,
        quantity: 50,
        product_margin: 0.25, // Low margin
        customer_segment: 'new',
      };

      // 15% discount - violates margin floor (25% - 15% = 10% < 15%)
      // and volume tier (15% > 10% and qty < 100)
      const result = await engine.evaluate(order, 0.15);

      assert.strictEqual(result.approved, false);
      assert.ok(result.applied_rules.includes('margin_floor'));
      assert.ok(result.applied_rules.includes('volume_tier'));
    });
  });

  describe('getPolicy', () => {
    it('returns the policy used by the engine', () => {
      const engine = new PolicyEngine(defaultPolicy);
      const policy = engine.getPolicy();

      assert.strictEqual(policy.id, 'default');
      assert.strictEqual(policy.name, 'Default Pricing Policy');
      assert.strictEqual(policy.rules.length, 3);
    });
  });

  describe('UCP error codes in violations', () => {
    it('includes UCP error code for margin_floor violation', async () => {
      const engine = new PolicyEngine(defaultPolicy);
      const order: Order = {
        order_value: 2000,
        quantity: 100,
        product_margin: 0.2,
      };

      const result = await engine.evaluate(order, 0.1);

      assert.strictEqual(result.approved, false);
      const marginViolation = result.violations.find((v) => v.rule === 'margin_floor');
      assert.ok(marginViolation);
      assert.strictEqual(marginViolation.ucp_error_code, 'discount_code_invalid');
    });

    it('includes UCP error code for volume_tier violation', async () => {
      const engine = new PolicyEngine(defaultPolicy);
      const order: Order = {
        order_value: 1000,
        quantity: 50,
        product_margin: 0.4,
      };

      const result = await engine.evaluate(order, 0.12);

      assert.strictEqual(result.approved, false);
      const volumeViolation = result.violations.find((v) => v.rule === 'volume_tier');
      assert.ok(volumeViolation);
      assert.strictEqual(volumeViolation.ucp_error_code, 'discount_code_user_ineligible');
    });
  });
});

describe('getUCPErrorCode', () => {
  it('maps max_discount to discount_code_invalid', () => {
    assert.strictEqual(getUCPErrorCode('max_discount'), 'discount_code_invalid');
  });

  it('maps margin_floor to discount_code_invalid', () => {
    assert.strictEqual(getUCPErrorCode('margin_floor'), 'discount_code_invalid');
  });

  it('maps volume_tier to discount_code_user_ineligible', () => {
    assert.strictEqual(getUCPErrorCode('volume_tier'), 'discount_code_user_ineligible');
  });

  it('maps stacking_not_allowed to discount_code_combination_disallowed', () => {
    assert.strictEqual(
      getUCPErrorCode('stacking_not_allowed'),
      'discount_code_combination_disallowed'
    );
  });

  it('maps discount_expired to discount_code_expired', () => {
    assert.strictEqual(getUCPErrorCode('discount_expired'), 'discount_code_expired');
  });

  it('maps login_required to discount_code_user_not_logged_in', () => {
    assert.strictEqual(getUCPErrorCode('login_required'), 'discount_code_user_not_logged_in');
  });

  it('returns discount_code_invalid for unknown rules', () => {
    assert.strictEqual(getUCPErrorCode('unknown_rule'), 'discount_code_invalid');
  });
});

describe('calculateAllocations', () => {
  it('allocates proportionally across line items', () => {
    const lineItems: LineItem[] = [
      { id: 'item1', subtotal: 7500 },
      { id: 'item2', subtotal: 2500 },
    ];

    const allocations = calculateAllocations(1000, lineItems, 'across');

    assert.strictEqual(allocations.length, 2);
    assert.strictEqual(allocations[0].target, '$.line_items[0]');
    assert.strictEqual(allocations[0].amount, 750);
    assert.strictEqual(allocations[1].target, '$.line_items[1]');
    assert.strictEqual(allocations[1].amount, 250);
  });

  it('allocates evenly with each method', () => {
    const lineItems: LineItem[] = [
      { id: 'item1', subtotal: 5000 },
      { id: 'item2', subtotal: 5000 },
    ];

    const allocations = calculateAllocations(1000, lineItems, 'each');

    assert.strictEqual(allocations.length, 2);
    assert.strictEqual(allocations[0].amount, 500);
    assert.strictEqual(allocations[1].amount, 500);
  });

  it('handles remainder in even split', () => {
    const lineItems: LineItem[] = [
      { id: 'item1', subtotal: 1000 },
      { id: 'item2', subtotal: 1000 },
      { id: 'item3', subtotal: 1000 },
    ];

    const allocations = calculateAllocations(100, lineItems, 'each');

    // 100 / 3 = 33 remainder 1
    assert.strictEqual(allocations[0].amount, 34); // First gets remainder
    assert.strictEqual(allocations[1].amount, 33);
    assert.strictEqual(allocations[2].amount, 33);
  });

  it('returns single totals allocation for empty line items', () => {
    const allocations = calculateAllocations(1000, [], 'across');

    assert.strictEqual(allocations.length, 1);
    assert.strictEqual(allocations[0].target, '$.totals');
    assert.strictEqual(allocations[0].amount, 1000);
  });
});

describe('calculateMaxDiscount', () => {
  it('returns volume tier limit for high margin product', () => {
    const order: Order = {
      order_value: 5000,
      quantity: 100,
      product_margin: 0.4,
    };

    const result = calculateMaxDiscount(order, defaultPolicy);

    assert.strictEqual(result.max_discount, 0.15);
    assert.strictEqual(result.limiting_factor, 'volume_tier');
  });

  it('returns margin floor limit for low margin product', () => {
    const order: Order = {
      order_value: 5000,
      quantity: 100,
      product_margin: 0.2,
    };

    const result = calculateMaxDiscount(order, defaultPolicy);

    // 20% margin - 15% floor = 5% max discount
    assert.ok(Math.abs(result.max_discount - 0.05) < 0.0001);
    assert.strictEqual(result.limiting_factor, 'margin_floor');
  });

  it('returns base tier limit for small orders', () => {
    const order: Order = {
      order_value: 500,
      quantity: 10,
      product_margin: 0.5,
    };

    const result = calculateMaxDiscount(order, defaultPolicy);

    assert.strictEqual(result.max_discount, 0.1);
    assert.strictEqual(result.limiting_factor, 'volume_tier');
  });

  it('respects custom margin floor', () => {
    const order: Order = {
      order_value: 5000,
      quantity: 100,
      product_margin: 0.25,
    };

    const result = calculateMaxDiscount(order, { marginFloor: 0.2 });

    // 25% margin - 20% floor = 5% max discount
    assert.ok(Math.abs(result.max_discount - 0.05) < 0.0001);
    assert.strictEqual(result.limiting_factor, 'margin_floor');
  });

  it('honours a custom policy instead of default-policy thresholds', async () => {
    // Stricter than the default on every axis, and with no volume tier at all.
    const strictPolicy: Policy = {
      id: 'strict',
      name: 'Strict Policy',
      rules: [
        {
          name: 'margin_floor',
          conditions: {
            all: [{ fact: 'calculated_margin', operator: 'lessThan', value: 0.3 }],
          },
          event: { type: 'violation', params: { rule: 'margin_floor', message: 'below floor' } },
          priority: 10,
        },
        {
          name: 'max_discount',
          conditions: {
            all: [{ fact: 'proposed_discount', operator: 'greaterThan', value: 0.08 }],
          },
          event: { type: 'violation', params: { rule: 'max_discount', message: 'over cap' } },
          priority: 10,
        },
      ],
    };

    const order: Order = { order_value: 50000, quantity: 500, product_margin: 0.4 };
    const result = calculateMaxDiscount(order, strictPolicy);

    // The 8% cap binds before the margin floor (40% - 30% = 10%), and the
    // default policy's 15% volume tier must not leak in.
    assert.strictEqual(result.max_discount, 0.08);
    assert.strictEqual(result.limiting_factor, 'max_discount');

    // The reported ceiling must actually be approved by the engine, and one step
    // above it must not be. This is the invariant the old implementation broke.
    const engine = new PolicyEngine(strictPolicy);
    const atCeiling = await engine.evaluate(order, result.max_discount);
    const aboveCeiling = await engine.evaluate(order, result.max_discount + 0.01);

    assert.strictEqual(atCeiling.approved, true);
    assert.strictEqual(aboveCeiling.approved, false);
  });

  it('reports undetermined rather than guessing when a policy states no limits', () => {
    const emptyPolicy: Policy = { id: 'empty', name: 'No Rules', rules: [] };
    const order: Order = { order_value: 5000, quantity: 100, product_margin: 0.4 };

    const result = calculateMaxDiscount(order, emptyPolicy);

    assert.strictEqual(result.max_discount, 0);
    assert.strictEqual(result.limiting_factor, 'undetermined');
  });
});

describe('extractPolicyThresholds', () => {
  it('recovers the default policy thresholds from its rule conditions', () => {
    const thresholds = extractPolicyThresholds(defaultPolicy);

    assert.strictEqual(thresholds.marginFloor, 0.15);
    assert.strictEqual(thresholds.maxDiscount, 0.25);
    assert.deepStrictEqual(thresholds.volumeTiers, [
      { minQuantity: 0, maxDiscount: 0.1 },
      { minQuantity: 100, maxDiscount: 0.15 },
    ]);
  });

  it('leaves thresholds undefined when the policy does not constrain them', () => {
    const marginOnly: Policy = {
      id: 'margin-only',
      name: 'Margin Only',
      rules: [
        {
          name: 'margin_floor',
          conditions: {
            all: [{ fact: 'calculated_margin', operator: 'lessThan', value: 0.22 }],
          },
          event: { type: 'violation', params: { rule: 'margin_floor', message: 'below floor' } },
        },
      ],
    };

    const thresholds = extractPolicyThresholds(marginOnly);

    assert.strictEqual(thresholds.marginFloor, 0.22);
    assert.strictEqual(thresholds.maxDiscount, undefined);
    assert.deepStrictEqual(thresholds.volumeTiers, []);
  });

  it('resolves the volume tier applicable to a quantity', () => {
    const { volumeTiers } = extractPolicyThresholds(defaultPolicy);

    assert.strictEqual(volumeTierLimit(volumeTiers, 10), 0.1);
    assert.strictEqual(volumeTierLimit(volumeTiers, 99), 0.1);
    assert.strictEqual(volumeTierLimit(volumeTiers, 100), 0.15);
    assert.strictEqual(volumeTierLimit(volumeTiers, 5000), 0.15);
    assert.strictEqual(volumeTierLimit([], 100), undefined);
  });
});
