/**
 * UCP Order Capability Types
 *
 * Based on the Universal Commerce Protocol specification.
 * See: https://ucp.dev/specification/order
 *
 * The Order Capability provides webhook-based updates for order
 * lifecycle events (shipped, delivered, returned, etc.).
 */

import type { Item, PostalAddress, Total } from './checkout.js';

/**
 * Order line item status (derived from quantities)
 */
export type OrderLineItemStatus = 'processing' | 'partial' | 'fulfilled';

/**
 * Quantity tracking for order line items
 */
export interface OrderQuantity {
  /** Total quantity ordered */
  total: number;
  /** Quantity fulfilled so far */
  fulfilled: number;
}

/**
 * Order line item
 */
export interface OrderLineItem {
  /** Line item identifier */
  id: string;
  /** The item that was purchased */
  item: Item;
  /** Quantity information */
  quantity: OrderQuantity;
  /** Price breakdown for this line item */
  totals: Total[];
  /** Derived status based on quantities */
  status: OrderLineItemStatus;
  /** Parent line item ID (for bundled/child items) */
  parent_id?: string;
}

/**
 * Fulfillment method type
 */
export type FulfillmentMethodType = 'shipping' | 'pickup' | 'digital';

/**
 * Fulfillment expectation (buyer-facing delivery promise)
 */
export interface FulfillmentExpectation {
  /** Expectation identifier */
  id: string;
  /** Items and quantities in this fulfillment group */
  line_items: Array<{
    /** Line item ID */
    id: string;
    /** Quantity in this group */
    quantity: number;
  }>;
  /** Delivery method */
  method_type: FulfillmentMethodType;
  /** Delivery destination */
  destination: PostalAddress;
  /** Human-readable delivery description */
  description?: string;
  /** When fulfillment can occur ('now' or ISO 8601 timestamp) */
  fulfillable_on?: string;
}

/**
 * Fulfillment event (append-only log entry)
 */
export interface FulfillmentEvent {
  /** Event identifier */
  id: string;
  /** When the event occurred (RFC 3339) */
  occurred_at: string;
  /** Event type (e.g., 'processing', 'shipped', 'delivered', 'canceled') */
  type: string;
  /** Items affected by this event */
  line_items: Array<{
    /** Line item ID */
    id: string;
    /** Quantity affected */
    quantity: number;
  }>;
  /** Shipment tracking number */
  tracking_number?: string;
  /** URL to track shipment */
  tracking_url?: string;
  /** Shipping carrier */
  carrier?: string;
  /** Human-readable description */
  description?: string;
}

/**
 * Order fulfillment information
 */
export interface OrderFulfillment {
  /** Fulfillment expectations (delivery promises) */
  expectations: FulfillmentExpectation[];
  /** Fulfillment events log */
  events: FulfillmentEvent[];
}

/**
 * Adjustment status
 */
export type AdjustmentStatus = 'pending' | 'completed' | 'failed';

/**
 * Order adjustment (refund, return, credit, dispute)
 * Append-only log, independent of fulfillment
 */
export interface OrderAdjustment {
  /** Adjustment identifier */
  id: string;
  /** Type of adjustment (e.g., 'refund', 'return', 'credit', 'dispute') */
  type: string;
  /** When the adjustment occurred (RFC 3339) */
  occurred_at: string;
  /** Adjustment status */
  status: AdjustmentStatus;
  /** Items affected (for partial adjustments) */
  line_items?: Array<{
    /** Line item ID */
    id: string;
    /** Quantity affected */
    quantity: number;
  }>;
  /** Adjustment amount in minor currency units */
  amount?: number;
  /** Human-readable description */
  description?: string;
}

/**
 * Complete order entity
 */
export interface Order {
  /** Order identifier */
  id: string;
  /** Associated checkout session ID (for reconciliation) */
  checkout_id: string;
  /** URL to view order on merchant site */
  permalink_url: string;
  /** Items that were purchased */
  line_items: OrderLineItem[];
  /** Fulfillment information */
  fulfillment: OrderFulfillment;
  /** Price breakdown */
  totals: Total[];
  /** Post-order adjustments (refunds, returns, etc.) */
  adjustments?: OrderAdjustment[];
}

/**
 * Order webhook event types
 */
export type OrderEventType =
  | 'order.created'
  | 'order.updated'
  | 'order.fulfillment.processing'
  | 'order.fulfillment.shipped'
  | 'order.fulfillment.delivered'
  | 'order.fulfillment.canceled'
  | 'order.adjustment.created'
  | 'order.adjustment.updated'
  | string; // Allow custom event types

/**
 * Order webhook event payload
 */
export interface OrderWebhookEvent {
  /** Unique event identifier */
  event_id: string;
  /** Event type */
  event_type: OrderEventType;
  /** When the event was created (RFC 3339) */
  created_time: string;
  /** The order data */
  order: Order;
}

/**
 * Order webhook response
 */
export interface OrderWebhookResponse {
  /** Whether the webhook was processed successfully */
  success: boolean;
  /** Error message if processing failed */
  error?: string;
}

/**
 * JWT header for webhook signature verification
 * Businesses sign payloads as detached JWTs (RFC 7797)
 */
export interface WebhookSignatureHeader {
  /** Algorithm (e.g., 'RS256') */
  alg: string;
  /** Key ID for signature verification */
  kid: string;
  /** Type (always 'JWT') */
  typ: 'JWT';
  /** Detached payload indicator */
  b64: false;
  /** Critical headers */
  crit: ['b64'];
}
