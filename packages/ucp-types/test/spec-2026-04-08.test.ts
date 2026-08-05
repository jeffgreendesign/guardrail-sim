import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CART_CAPABILITY,
  CATALOG_CAPABILITY,
  CHECKOUT_CAPABILITY,
  DISCOUNT_EXTENSION,
  FULFILLMENT_EXTENSION,
  GUARDRAIL_UCP_PROFILE,
  IDENTITY_LINKING_CAPABILITY,
  ORDER_CAPABILITY,
  SUPPORTED_UCP_VERSIONS,
  UCP_SPEC_VERSION,
  createAppliedDiscount,
  serializeProfile,
} from '../dist/index.js';

describe('UCP 2026-04-08', () => {
  it('targets the 2026-04-08 revision', () => {
    assert.strictEqual(UCP_SPEC_VERSION, '2026-04-08');
    assert.strictEqual(SUPPORTED_UCP_VERSIONS[0], UCP_SPEC_VERSION);
  });

  it('versions every capability at the spec revision', () => {
    for (const capability of [
      CHECKOUT_CAPABILITY,
      DISCOUNT_EXTENSION,
      ORDER_CAPABILITY,
      CART_CAPABILITY,
      CATALOG_CAPABILITY,
      FULFILLMENT_EXTENSION,
      IDENTITY_LINKING_CAPABILITY,
    ]) {
      assert.strictEqual(capability.version, UCP_SPEC_VERSION, `${capability.name} is out of date`);
    }
  });

  it('extends both checkout and cart from the discount extension', () => {
    // 2026-04-08 allows multiple parents; this previously named checkout only.
    assert.deepStrictEqual(DISCOUNT_EXTENSION.extends, [
      'dev.ucp.shopping.checkout',
      'dev.ucp.shopping.cart',
    ]);
  });

  it('graduates cart out of draft', () => {
    assert.notStrictEqual(CART_CAPABILITY.version, 'draft');
  });

  it('namespaces identity linking under dev.ucp.common', () => {
    assert.strictEqual(IDENTITY_LINKING_CAPABILITY.name, 'dev.ucp.common.identity_linking');
  });

  it('serializes a profile whose versions all match the constants', () => {
    const profile = JSON.parse(serializeProfile()) as typeof GUARDRAIL_UCP_PROFILE;

    for (const capability of profile.capabilities) {
      assert.strictEqual(capability.version, UCP_SPEC_VERSION);
    }
    for (const service of profile.services) {
      assert.strictEqual(service.version, UCP_SPEC_VERSION);
    }
  });

  describe('discount sign convention', () => {
    it('states applied discount amounts as positive values', () => {
      // In `discounts.applied` the amount is the discount's VALUE, so it is positive.
      // Only its entry in totals[] carries the negative sign. The two are
      // deliberately opposite, and conflating them double-counts the discount.
      const applied = createAppliedDiscount('SAVE10', 1500, { title: '10% off' });

      assert.strictEqual(applied.amount, 1500);
      assert.strictEqual(applied.amount > 0, true, 'applied discount amount must be positive');
    });
  });
});
