/**
 * UCP Capability and Extension version constants
 *
 * Based on UCP specification v2026-01-11.
 * See: https://ucp.dev/specification/overview
 */

/** Current UCP specification version */
export const UCP_SPEC_VERSION = '2026-01-11' as const;

/** UCP capability descriptor type */
export interface UCPCapabilityDescriptor {
  readonly name: string;
  readonly version: string;
  readonly schema: string;
  readonly extends?: string;
}

export const CHECKOUT_CAPABILITY = {
  name: 'dev.ucp.shopping.checkout',
  version: '2026-01-11',
  schema: 'https://ucp.dev/schemas/shopping/checkout.json',
} as const satisfies UCPCapabilityDescriptor;

export const DISCOUNT_EXTENSION = {
  name: 'dev.ucp.shopping.discount',
  version: '2026-01-11',
  extends: 'dev.ucp.shopping.checkout',
  schema: 'https://ucp.dev/schemas/shopping/discount.json',
} as const satisfies UCPCapabilityDescriptor;

export const ORDER_CAPABILITY = {
  name: 'dev.ucp.shopping.order',
  version: '2026-01-11',
  schema: 'https://ucp.dev/schemas/shopping/order.json',
} as const satisfies UCPCapabilityDescriptor;

export const CART_CAPABILITY = {
  name: 'dev.ucp.shopping.cart',
  version: 'draft',
  schema: 'https://ucp.dev/schemas/shopping/cart.json',
} as const satisfies UCPCapabilityDescriptor;

export const FULFILLMENT_EXTENSION = {
  name: 'dev.ucp.shopping.fulfillment',
  version: '2026-01-11',
  extends: 'dev.ucp.shopping.checkout',
  schema: 'https://ucp.dev/schemas/shopping/fulfillment.json',
} as const satisfies UCPCapabilityDescriptor;

export const IDENTITY_LINKING_CAPABILITY = {
  name: 'dev.ucp.identity_linking',
  version: '2026-01-11',
  schema: 'https://ucp.dev/schemas/identity-linking.json',
} as const satisfies UCPCapabilityDescriptor;
