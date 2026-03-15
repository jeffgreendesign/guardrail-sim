/**
 * UCP Cart Capability Types
 *
 * Based on the Universal Commerce Protocol specification (draft).
 * See: https://ucp.dev/specification/cart
 *
 * The Cart capability provides a lightweight CRUD interface for
 * item collection before purchase intent is established.
 * Cart is separate from Checkout: no payment or fulfillment required.
 */

import type { CurrencyCode, Item, ItemReference } from './checkout.js';

/**
 * Cart status
 * Unlike Checkout, Cart has simple binary status.
 */
export type CartStatus = 'active' | 'not_found';

/**
 * A line item in a cart (simpler than checkout line items)
 */
export interface CartLineItem {
  /** Unique line item identifier */
  id: string;
  /** The item */
  item: Item;
  /** Quantity */
  quantity: number;
}

/**
 * Cart response
 */
export interface CartResponse {
  /** Cart identifier */
  id: string;
  /** Cart status */
  status: CartStatus;
  /** Currency for the cart (ISO 4217) */
  currency: CurrencyCode;
  /** Line items in the cart */
  line_items: CartLineItem[];
}

/**
 * Input line item for cart create/update requests
 */
export interface CartLineItemInput {
  /** Item or item reference */
  item: Item | ItemReference;
  /** Quantity */
  quantity: number;
}

/**
 * Request to create a cart
 */
export interface CreateCartRequest {
  /** Currency for the cart (ISO 4217) */
  currency: CurrencyCode;
  /** Initial line items */
  line_items: CartLineItemInput[];
}

/**
 * Request to update a cart
 */
export interface UpdateCartRequest {
  /** Updated line items (replaces existing) */
  line_items?: CartLineItemInput[];
}
