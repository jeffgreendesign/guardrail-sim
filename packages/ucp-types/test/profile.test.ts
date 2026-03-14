import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { negotiateCapabilities, profileSupportsCapability } from '../dist/profile.js';
import type { UCPProfile } from '../dist/profile.js';
import { CHECKOUT_CAPABILITY, DISCOUNT_EXTENSION } from '../dist/versions.js';

describe('UCP Profile', () => {
  const businessProfile: UCPProfile = {
    name: 'test-business',
    capabilities: [
      { name: 'dev.ucp.shopping.checkout', version: '2026-01-11' },
      {
        name: 'dev.ucp.shopping.discount',
        version: '2026-01-11',
        extends: 'dev.ucp.shopping.checkout',
      },
      { name: 'dev.ucp.shopping.order', version: '2026-01-11' },
    ],
    services: [{ transport: 'mcp', endpoint: 'stdio://test' }],
  };

  const platformProfile: UCPProfile = {
    name: 'test-platform',
    capabilities: [
      { name: 'dev.ucp.shopping.checkout', version: '2026-01-11' },
      {
        name: 'dev.ucp.shopping.discount',
        version: '2026-01-11',
        extends: 'dev.ucp.shopping.checkout',
      },
    ],
    services: [{ transport: 'mcp', endpoint: 'stdio://platform' }],
  };

  describe('negotiateCapabilities', () => {
    it('returns intersection of capabilities', () => {
      const result = negotiateCapabilities(businessProfile, platformProfile);
      assert.equal(result.length, 2);
      assert.equal(result[0]!.name, 'dev.ucp.shopping.checkout');
      assert.equal(result[1]!.name, 'dev.ucp.shopping.discount');
    });

    it('selects lower version for compatibility', () => {
      const olderPlatform: UCPProfile = {
        name: 'old-platform',
        capabilities: [{ name: 'dev.ucp.shopping.checkout', version: '2025-06-01' }],
        services: [],
      };
      const result = negotiateCapabilities(businessProfile, olderPlatform);
      assert.equal(result.length, 1);
      assert.equal(result[0]!.version, '2025-06-01');
    });

    it('returns empty array for disjoint capabilities', () => {
      const disjointPlatform: UCPProfile = {
        name: 'disjoint',
        capabilities: [{ name: 'dev.ucp.shopping.cart', version: 'draft' }],
        services: [],
      };
      const result = negotiateCapabilities(businessProfile, disjointPlatform);
      assert.equal(result.length, 0);
    });

    it('handles empty capabilities arrays', () => {
      const empty: UCPProfile = { name: 'empty', capabilities: [], services: [] };
      const result = negotiateCapabilities(businessProfile, empty);
      assert.equal(result.length, 0);
    });
  });

  describe('profileSupportsCapability', () => {
    it('returns true for supported capability', () => {
      assert.equal(profileSupportsCapability(businessProfile, CHECKOUT_CAPABILITY), true);
    });

    it('returns true for supported extension', () => {
      assert.equal(profileSupportsCapability(businessProfile, DISCOUNT_EXTENSION), true);
    });

    it('returns false for unsupported capability', () => {
      assert.equal(
        profileSupportsCapability(platformProfile, {
          name: 'dev.ucp.shopping.order',
          version: '2026-01-11',
          schema: 'https://ucp.dev/schemas/shopping/order.json',
        }),
        false
      );
    });

    it('returns false for newer version than supported', () => {
      assert.equal(
        profileSupportsCapability(businessProfile, {
          name: 'dev.ucp.shopping.checkout',
          version: '2027-01-01',
          schema: 'https://ucp.dev/schemas/shopping/checkout.json',
        }),
        false
      );
    });
  });
});
