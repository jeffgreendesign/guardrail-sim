import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PolicyEngine, defaultPolicy } from '../dist/index.js';
import type { Order } from '../dist/types.js';

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
});
