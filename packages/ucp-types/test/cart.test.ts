import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fromUCPCartToOrder, toCheckoutFromCart } from '../dist/converters.js';
import type { CartResponse } from '../dist/cart.js';

describe('Cart Converters', () => {
  const sampleCart: CartResponse = {
    id: 'cart-001',
    status: 'active',
    currency: 'USD',
    line_items: [
      {
        id: 'li-1',
        item: { id: 'item-1', title: 'Widget', price: 5000 },
        quantity: 2,
      },
      {
        id: 'li-2',
        item: { id: 'item-2', title: 'Gadget', price: 10000 },
        quantity: 1,
      },
    ],
  };

  describe('fromUCPCartToOrder', () => {
    it('converts cart to policy-engine order', () => {
      const order = fromUCPCartToOrder(sampleCart);
      assert.equal(order.order_value, 20000); // 5000*2 + 10000*1
      assert.equal(order.quantity, 3);
      assert.equal(order.product_margin, 0.3); // default
    });

    it('uses custom options', () => {
      const order = fromUCPCartToOrder(sampleCart, {
        customerSegment: 'enterprise',
        productMargin: 0.4,
      });
      assert.equal(order.customer_segment, 'enterprise');
      assert.equal(order.product_margin, 0.4);
    });

    it('handles empty cart', () => {
      const emptyCart: CartResponse = {
        id: 'cart-empty',
        status: 'active',
        currency: 'USD',
        line_items: [],
      };
      const order = fromUCPCartToOrder(emptyCart);
      assert.equal(order.order_value, 0);
      assert.equal(order.quantity, 0);
    });
  });

  describe('toCheckoutFromCart', () => {
    it('produces a create checkout request from cart', () => {
      const request = toCheckoutFromCart(sampleCart);
      assert.equal(request.currency, 'USD');
      assert.equal(request.line_items.length, 2);
      assert.equal(request.line_items[0]!.quantity, 2);
      assert.deepEqual(request.line_items[0]!.item, {
        id: 'item-1',
        title: 'Widget',
        price: 5000,
      });
    });

    it('handles empty cart', () => {
      const emptyCart: CartResponse = {
        id: 'cart-empty',
        status: 'active',
        currency: 'USD',
        line_items: [],
      };
      const request = toCheckoutFromCart(emptyCart);
      assert.equal(request.currency, 'USD');
      assert.equal(request.line_items.length, 0);
    });
  });
});
