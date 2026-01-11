/**
 * UCP Checkout Capability Types
 *
 * Based on the Universal Commerce Protocol specification.
 * See: https://ucp.dev/specification/checkout
 *
 * The Checkout Capability manages shopping sessions from cart
 * creation through order completion.
 */

import type { DiscountResponse } from './discount.js';

/**
 * Checkout session status
 */
export type CheckoutStatus =
  | 'incomplete' // Missing required info
  | 'requires_escalation' // Needs buyer handoff
  | 'ready_for_complete' // Can be finalized
  | 'complete_in_progress' // Processing completion
  | 'completed' // Order placed (terminal)
  | 'canceled'; // Session terminated (terminal)

/**
 * Currency code (ISO 4217)
 */
export type CurrencyCode = string;

/**
 * Money amount in minor currency units
 */
export interface Money {
  /** Amount in minor units (e.g., cents) */
  amount: number;
  /** ISO 4217 currency code */
  currency: CurrencyCode;
}

/**
 * An item in the catalog
 */
export interface Item {
  /** Unique item identifier */
  id: string;
  /** Item name/title */
  title?: string;
  /** Item description */
  description?: string;
  /** Image URL */
  image_url?: string;
  /** Unit price */
  price?: Money;
}

/**
 * A line item in the checkout
 */
export interface LineItem {
  /** Reference to the item */
  item: Item | { id: string };
  /** Quantity ordered */
  quantity: number;
  /** Line item total before discounts */
  subtotal?: Money;
  /** Discount applied to this line item */
  discount?: Money;
  /** Line item total after discounts */
  total?: Money;
}

/**
 * Buyer information
 */
export interface Buyer {
  /** Buyer email address */
  email?: string;
  /** Buyer first name */
  first_name?: string;
  /** Buyer last name */
  last_name?: string;
  /** Buyer phone number */
  phone?: string;
}

/**
 * Total line type
 */
export type TotalType =
  | 'subtotal'
  | 'items_discount'
  | 'discount'
  | 'shipping'
  | 'shipping_discount'
  | 'tax'
  | 'total';

/**
 * A total line in the checkout summary
 */
export interface Total {
  /** Type of total */
  type: TotalType;
  /** Label for display */
  label?: string;
  /** Amount */
  amount: Money;
}

/**
 * Checkout session response
 */
export interface CheckoutResponse {
  /** Session identifier */
  id: string;
  /** Current session status */
  status: CheckoutStatus;
  /** Currency for the session */
  currency: CurrencyCode;
  /** Line items in the cart */
  line_items: LineItem[];
  /** Buyer information */
  buyer?: Buyer;
  /** Totals breakdown */
  totals?: Total[];
  /** URL for buyer handoff (when status is requires_escalation) */
  continue_url?: string;
  /** Session expiration timestamp */
  expires_at?: string;
  /** Messages (errors, warnings) */
  messages?: CheckoutMessage[];
}

/**
 * Checkout session with discount extension
 */
export interface CheckoutWithDiscounts extends CheckoutResponse {
  /** Discount extension data */
  'dev.ucp.shopping.discount'?: DiscountResponse;
}

/**
 * Message severity for checkout messages
 */
export type CheckoutMessageSeverity =
  | 'recoverable'
  | 'requires_buyer_input'
  | 'requires_buyer_review';

/**
 * A message in the checkout response
 */
export interface CheckoutMessage {
  /** Message severity */
  severity: CheckoutMessageSeverity;
  /** Error/warning code */
  code: string;
  /** Human-readable message */
  message: string;
  /** Path to the affected field */
  field?: string;
}

/**
 * Create checkout request
 */
export interface CreateCheckoutRequest {
  /** Currency for the session */
  currency: CurrencyCode;
  /** Line items to add */
  line_items: LineItem[];
  /** Buyer information */
  buyer?: Buyer;
}

/**
 * Create checkout request with discount extension
 */
export interface CreateCheckoutWithDiscountsRequest extends CreateCheckoutRequest {
  /** Discount extension data */
  'dev.ucp.shopping.discount'?: {
    codes: string[];
  };
}

/**
 * Update checkout request
 */
export interface UpdateCheckoutRequest {
  /** Updated line items */
  line_items?: LineItem[];
  /** Updated buyer information */
  buyer?: Buyer;
}

/**
 * Update checkout request with discount extension
 */
export interface UpdateCheckoutWithDiscountsRequest extends UpdateCheckoutRequest {
  /** Discount extension data */
  'dev.ucp.shopping.discount'?: {
    codes: string[];
  };
}

/**
 * MCP metadata for UCP requests
 */
export interface UCPMeta {
  /** Platform profile URL */
  profile: string;
}

/**
 * MCP request wrapper with UCP metadata
 */
export interface MCPRequest<T> {
  /** MCP metadata */
  _meta: {
    ucp: UCPMeta;
  };
  /** Request payload */
  params: T;
}

/**
 * Order reference (returned after checkout completion)
 */
export interface OrderReference {
  /** Order identifier */
  id: string;
  /** Order confirmation number */
  confirmation_number?: string;
  /** URL to view order status */
  status_url?: string;
}

/**
 * Complete checkout response
 */
export interface CompleteCheckoutResponse extends CheckoutResponse {
  /** Order reference (when completed) */
  order?: OrderReference;
}
