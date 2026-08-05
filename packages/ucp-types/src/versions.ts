/**
 * UCP Capability and Extension version constants
 *
 * Based on UCP specification v2026-04-08.
 * See: https://ucp.dev/2026-04-08/specification/overview
 */

/** Current UCP specification version */
export const UCP_SPEC_VERSION = '2026-04-08' as const;

/**
 * Earlier revisions this project can still read.
 *
 * Capabilities version independently of the protocol: adding optional fields or
 * new endpoints is backwards-compatible, so a 2026-01-11 payload still parses.
 */
export const SUPPORTED_UCP_VERSIONS = ['2026-04-08', '2026-01-23', '2026-01-11'] as const;

/** UCP capability descriptor type */
export interface UCPCapabilityDescriptor {
  readonly name: string;
  readonly version: string;
  readonly schema: string;
  /**
   * The capability or capabilities this extension augments.
   *
   * 2026-04-08 allows multiple parents — the discount extension declares
   * `["dev.ucp.shopping.checkout", "dev.ucp.shopping.cart"]`.
   */
  readonly extends?: string | readonly string[];
}

export const CHECKOUT_CAPABILITY = {
  name: 'dev.ucp.shopping.checkout',
  version: UCP_SPEC_VERSION,
  schema: 'https://ucp.dev/schemas/shopping/checkout.json',
} as const satisfies UCPCapabilityDescriptor;

/**
 * The discount extension augments both checkout and cart as of 2026-04-08.
 * It previously declared checkout only.
 */
export const DISCOUNT_EXTENSION = {
  name: 'dev.ucp.shopping.discount',
  version: UCP_SPEC_VERSION,
  extends: ['dev.ucp.shopping.checkout', 'dev.ucp.shopping.cart'],
  schema: 'https://ucp.dev/schemas/shopping/discount.json',
} as const satisfies UCPCapabilityDescriptor;

export const ORDER_CAPABILITY = {
  name: 'dev.ucp.shopping.order',
  version: UCP_SPEC_VERSION,
  schema: 'https://ucp.dev/schemas/shopping/order.json',
} as const satisfies UCPCapabilityDescriptor;

/** Cart graduated from draft to a dated revision in 2026-04-08. */
export const CART_CAPABILITY = {
  name: 'dev.ucp.shopping.cart',
  version: UCP_SPEC_VERSION,
  schema: 'https://ucp.dev/schemas/shopping/cart.json',
} as const satisfies UCPCapabilityDescriptor;

/** Product search and lookup. New in 2026-04-08. */
export const CATALOG_CAPABILITY = {
  name: 'dev.ucp.shopping.catalog',
  version: UCP_SPEC_VERSION,
  schema: 'https://ucp.dev/schemas/shopping/catalog.json',
} as const satisfies UCPCapabilityDescriptor;

export const FULFILLMENT_EXTENSION = {
  name: 'dev.ucp.shopping.fulfillment',
  version: UCP_SPEC_VERSION,
  extends: 'dev.ucp.shopping.checkout',
  schema: 'https://ucp.dev/schemas/shopping/fulfillment.json',
} as const satisfies UCPCapabilityDescriptor;

/**
 * Identity linking moved to the `dev.ucp.common` namespace in 2026-04-08;
 * it was `dev.ucp.identity_linking` here previously.
 */
export const IDENTITY_LINKING_CAPABILITY = {
  name: 'dev.ucp.common.identity_linking',
  version: UCP_SPEC_VERSION,
  schema: 'https://ucp.dev/schemas/identity-linking.json',
} as const satisfies UCPCapabilityDescriptor;
