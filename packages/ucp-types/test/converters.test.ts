import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  toUCPErrorCode,
  toUCPMessage,
  toDiscountValidationResult,
  createAppliedDiscount,
  createRejectedDiscount,
  fromUCPLineItems,
  buildDiscountExtensionResponse,
  calculateAllocations,
} from '../dist/converters.js';

import type { EvaluationResult, Violation } from '@guardrail-sim/policy-engine';
import type { LineItem } from '../dist/checkout.js';

describe('UCP Converters', () => {
  describe('toUCPErrorCode', () => {
    it('maps max_discount_exceeded to discount_code_invalid', () => {
      const violation: Violation = {
        rule: 'max_discount_exceeded',
        message: 'Discount exceeds maximum allowed',
      };
      assert.strictEqual(toUCPErrorCode(violation), 'discount_code_invalid');
    });

    it('maps margin_floor_violated to discount_code_invalid', () => {
      const violation: Violation = {
        rule: 'margin_floor_violated',
        message: 'Discount would breach margin floor',
      };
      assert.strictEqual(toUCPErrorCode(violation), 'discount_code_invalid');
    });

    it('maps volume_tier_mismatch to discount_code_user_ineligible', () => {
      const violation: Violation = {
        rule: 'volume_tier_mismatch',
        message: 'Customer not eligible for volume discount',
      };
      assert.strictEqual(toUCPErrorCode(violation), 'discount_code_user_ineligible');
    });

    it('maps unknown violations to discount_code_invalid', () => {
      const violation: Violation = {
        rule: 'some_unknown_rule',
        message: 'Unknown error',
      };
      assert.strictEqual(toUCPErrorCode(violation), 'discount_code_invalid');
    });
  });

  describe('toUCPMessage', () => {
    it('creates a warning message from violation', () => {
      const violation: Violation = {
        rule: 'max_discount_exceeded',
        message: 'Discount too high',
      };
      const message = toUCPMessage(violation);

      assert.strictEqual(message.type, 'warning');
      assert.strictEqual(message.code, 'discount_code_invalid');
      assert.strictEqual(message.message, 'Discount too high');
    });
  });

  describe('toDiscountValidationResult', () => {
    it('returns valid result for approved evaluation', () => {
      const evaluation: EvaluationResult = {
        approved: true,
        violations: [],
        applied_rules: ['volume_tier'],
        calculated_margin: 0.2,
      };

      const result = toDiscountValidationResult(evaluation);

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.error_code, undefined);
    });

    it('returns invalid result with error code for rejected evaluation', () => {
      const evaluation: EvaluationResult = {
        approved: false,
        violations: [{ rule: 'max_discount_exceeded', message: 'Discount too high' }],
        applied_rules: [],
        calculated_margin: 0.05,
      };

      const result = toDiscountValidationResult(evaluation);

      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.error_code, 'discount_code_invalid');
      assert.strictEqual(result.limiting_factor, 'max_discount_exceeded');
    });
  });

  describe('createAppliedDiscount', () => {
    it('creates applied discount with defaults', () => {
      const discount = createAppliedDiscount('SUMMER20', 1000, 'Summer Sale');

      assert.strictEqual(discount.code, 'SUMMER20');
      assert.strictEqual(discount.amount, 1000);
      assert.strictEqual(discount.title, 'Summer Sale');
      assert.strictEqual(discount.method, 'across');
      assert.strictEqual(discount.priority, 1);
      assert.strictEqual(discount.automatic, undefined);
      assert.deepStrictEqual(discount.allocations, [{ target: '$.totals', amount: 1000 }]);
    });

    it('creates automatic discount without code', () => {
      const discount = createAppliedDiscount('AUTO', 500, 'Auto Discount', {
        automatic: true,
      });

      assert.strictEqual(discount.code, undefined);
      assert.strictEqual(discount.automatic, true);
    });
  });

  describe('createRejectedDiscount', () => {
    it('creates rejected discount with UCP error code', () => {
      const violation: Violation = {
        rule: 'discount_expired',
        message: 'This discount has expired',
      };

      const rejected = createRejectedDiscount('OLDCODE', violation);

      assert.strictEqual(rejected.code, 'OLDCODE');
      assert.strictEqual(rejected.error_code, 'discount_code_expired');
      assert.strictEqual(rejected.message, 'This discount has expired');
    });
  });

  describe('fromUCPLineItems', () => {
    it('converts line items to order', () => {
      const lineItems: LineItem[] = [
        {
          item: { id: 'item1' },
          quantity: 2,
          subtotal: { amount: 5000, currency: 'USD' },
        },
        {
          item: { id: 'item2' },
          quantity: 1,
          subtotal: { amount: 3000, currency: 'USD' },
        },
      ];

      const order = fromUCPLineItems(lineItems);

      assert.strictEqual(order.order_value, 8000);
      assert.strictEqual(order.quantity, 3);
      assert.strictEqual(order.product_margin, 0.3);
    });

    it('accepts custom customer segment and margin', () => {
      const lineItems: LineItem[] = [
        {
          item: { id: 'item1' },
          quantity: 100,
          subtotal: { amount: 50000, currency: 'USD' },
        },
      ];

      const order = fromUCPLineItems(lineItems, {
        customerSegment: 'enterprise',
        productMargin: 0.4,
      });

      assert.strictEqual(order.customer_segment, 'enterprise');
      assert.strictEqual(order.product_margin, 0.4);
    });
  });

  describe('buildDiscountExtensionResponse', () => {
    it('builds response for approved discount', () => {
      const evaluation: EvaluationResult = {
        approved: true,
        violations: [],
        applied_rules: ['volume_tier'],
        calculated_margin: 0.2,
      };

      const response = buildDiscountExtensionResponse(
        ['SUMMER20'],
        evaluation,
        1000,
        'Summer Sale'
      );

      assert.deepStrictEqual(response.codes, ['SUMMER20']);
      assert.strictEqual(response.applied.length, 1);
      assert.strictEqual(response.applied[0].code, 'SUMMER20');
      assert.strictEqual(response.applied[0].amount, 1000);
      assert.strictEqual(response.messages, undefined);
    });

    it('builds response for rejected discount', () => {
      const evaluation: EvaluationResult = {
        approved: false,
        violations: [{ rule: 'max_discount_exceeded', message: 'Too high' }],
        applied_rules: [],
        calculated_margin: 0.05,
      };

      const response = buildDiscountExtensionResponse(['BIGDISCOUNT'], evaluation, 5000);

      assert.deepStrictEqual(response.codes, ['BIGDISCOUNT']);
      assert.strictEqual(response.applied.length, 0);
      assert.strictEqual(response.messages?.length, 1);
      assert.strictEqual(response.messages?.[0].code, 'discount_code_invalid');
    });
  });

  describe('calculateAllocations', () => {
    it('allocates proportionally across line items', () => {
      const lineItems: LineItem[] = [
        {
          item: { id: 'item1' },
          quantity: 1,
          subtotal: { amount: 7500, currency: 'USD' },
        },
        {
          item: { id: 'item2' },
          quantity: 1,
          subtotal: { amount: 2500, currency: 'USD' },
        },
      ];

      const allocations = calculateAllocations(1000, lineItems, 'across');

      assert.strictEqual(allocations.length, 2);
      assert.strictEqual(allocations[0].target, '$.line_items[0]');
      assert.strictEqual(allocations[0].amount, 750); // 75% of 1000
      assert.strictEqual(allocations[1].target, '$.line_items[1]');
      assert.strictEqual(allocations[1].amount, 250); // 25% of 1000
    });

    it('allocates evenly with each method', () => {
      const lineItems: LineItem[] = [
        { item: { id: 'item1' }, quantity: 1 },
        { item: { id: 'item2' }, quantity: 1 },
      ];

      const allocations = calculateAllocations(1000, lineItems, 'each');

      assert.strictEqual(allocations.length, 2);
      assert.strictEqual(allocations[0].amount, 500);
      assert.strictEqual(allocations[1].amount, 500);
    });

    it('handles remainder in even split', () => {
      const lineItems: LineItem[] = [
        { item: { id: 'item1' }, quantity: 1 },
        { item: { id: 'item2' }, quantity: 1 },
        { item: { id: 'item3' }, quantity: 1 },
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
});
