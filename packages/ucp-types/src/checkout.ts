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
 * Note: UCP spec uses raw integers for amounts; this wrapper provides currency context
 */
export interface Money {
  /** Amount in minor units (e.g., cents) */
  amount: number;
  /** ISO 4217 currency code */
  currency: CurrencyCode;
}

/**
 * Postal address for shipping/billing
 * See: https://ucp.dev/specification/checkout#postal-address
 */
export interface PostalAddress {
  /** Street address line 1 */
  street_address?: string;
  /** Street address line 2 (apt, suite, etc.) */
  extended_address?: string;
  /** City/locality */
  address_locality?: string;
  /** State/province/region */
  address_region?: string;
  /** Country code (ISO 3166-1 alpha-2) */
  address_country?: string;
  /** Postal/ZIP code */
  postal_code?: string;
  /** Recipient first name */
  first_name?: string;
  /** Recipient last name */
  last_name?: string;
  /** Recipient full name */
  full_name?: string;
  /** Contact phone (E.164 format) */
  phone_number?: string;
}

/**
 * An item in the catalog
 * See: https://ucp.dev/specification/checkout#item-response
 */
export interface Item {
  /** Unique item identifier */
  id: string;
  /** Item name/title (required in spec) */
  title: string;
  /** Unit price in minor currency units (required in spec) */
  price: number;
  /** Item description */
  description?: string;
  /** Image URL */
  image_url?: string;
}

/**
 * Item reference (for requests where full item details aren't needed)
 */
export interface ItemReference {
  /** Unique item identifier */
  id: string;
}

/**
 * Total line type
 * See: https://ucp.dev/specification/checkout#total-response
 */
export type TotalType =
  | 'subtotal'
  | 'items_discount'
  | 'discount'
  | 'fulfillment' // UCP spec term (replaces 'shipping')
  | 'tax'
  | 'fee'
  | 'total';

/**
 * A total line in the checkout summary
 * See: https://ucp.dev/specification/checkout#total-response
 */
export interface Total {
  /** Type of total */
  type: TotalType;
  /** Amount in minor currency units */
  amount: number;
  /** Human-readable display text */
  display_text?: string;
}

/**
 * A line item in the checkout response
 * See: https://ucp.dev/specification/checkout#line-item-response
 */
export interface LineItem {
  /** Unique line item identifier */
  id: string;
  /** The item being purchased */
  item: Item;
  /** Quantity ordered */
  quantity: number;
  /** Totals breakdown for this line item */
  totals: Total[];
  /** Parent line item ID (for bundled/child items) */
  parent_id?: string;
}

/**
 * A line item in checkout requests (less strict)
 */
export interface LineItemRequest {
  /** Reference to the item */
  item: Item | ItemReference;
  /** Quantity to add */
  quantity: number;
}

/**
 * Buyer information
 * See: https://ucp.dev/specification/checkout#buyer
 */
export interface Buyer {
  /** Buyer email address */
  email?: string;
  /** Buyer first name */
  first_name?: string;
  /** Buyer last name */
  last_name?: string;
  /** Buyer full name */
  full_name?: string;
  /** Buyer phone number (E.164 format) */
  phone_number?: string;
}

/**
 * Well-known link types for checkout
 */
export type LinkType =
  | 'privacy_policy'
  | 'terms_of_service'
  | 'refund_policy'
  | 'shipping_policy'
  | 'faq'
  | string; // Allow custom types

/**
 * Link to legal/policy pages
 * See: https://ucp.dev/specification/checkout#link
 */
export interface Link {
  /** Link type (well-known or custom) */
  type: LinkType;
  /** HTTPS URL to the page */
  url: string;
  /** Human-readable title */
  title?: string;
}

/**
 * Payment handler configuration
 * See: https://ucp.dev/specification/checkout#payment-handler-response
 */
export interface PaymentHandler {
  /** Handler identifier */
  id: string;
  /** Handler name (reverse-DNS format, e.g., 'com.stripe.payments') */
  name: string;
  /** Handler version (YYYY-MM-DD format) */
  version: string;
  /** Specification URL */
  spec: string;
  /** JSON Schema for handler configuration */
  config_schema: string;
  /** Supported instrument schema URLs */
  instrument_schemas: string[];
  /** Handler-specific configuration */
  config: Record<string, unknown>;
}

/**
 * Card number type for payment credentials
 */
export type CardNumberType = 'fpan' | 'network_token' | 'dpan';

/**
 * Card payment credential
 */
export interface CardCredential {
  type: 'card';
  /** Type of card number */
  card_number_type: CardNumberType;
  /** Card number */
  number?: string;
  /** Expiry month (1-12) */
  expiry_month?: number;
  /** Expiry year */
  expiry_year?: number;
  /** Cardholder name */
  name?: string;
  /** Card verification code */
  cvc?: string;
  /** Network token cryptogram */
  cryptogram?: string;
  /** ECI value for 3DS */
  eci_value?: string;
}

/**
 * Token-based payment credential
 */
export interface TokenCredential {
  type: string;
  /** Payment token */
  token: string;
}

/**
 * Payment credential (card or token)
 */
export type PaymentCredential = CardCredential | TokenCredential;

/**
 * Card payment instrument
 * See: https://ucp.dev/specification/checkout#card-payment-instrument
 */
export interface CardPaymentInstrument {
  /** Instrument identifier */
  id: string;
  /** Associated handler ID */
  handler_id: string;
  /** Instrument type */
  type: 'card';
  /** Card brand (visa, mastercard, amex, etc.) */
  brand: string;
  /** Last 4 digits of card number */
  last_digits: string;
  /** Billing address */
  billing_address?: PostalAddress;
  /** Payment credential */
  credential?: PaymentCredential;
  /** Expiry month (1-12) */
  expiry_month?: number;
  /** Expiry year */
  expiry_year?: number;
  /** Rich text description for display */
  rich_text_description?: string;
  /** Card art image URI */
  rich_card_art?: string;
}

/**
 * Payment instrument (extensible for different types)
 */
export type PaymentInstrument = CardPaymentInstrument;

/**
 * Payment configuration in checkout response
 * See: https://ucp.dev/specification/checkout#payment-response
 */
export interface PaymentResponse {
  /** Available payment handlers */
  handlers: PaymentHandler[];
  /** Currently selected instrument ID */
  selected_instrument_id?: string;
  /** Available payment instruments */
  instruments?: PaymentInstrument[];
}

/**
 * Fulfillment option for delivery
 * See: https://ucp.dev/specification/checkout#fulfillment-option
 */
export interface FulfillmentOption {
  /** Option identifier */
  id: string;
  /** Display title */
  title: string;
  /** Description */
  description?: string;
  /** Shipping carrier */
  carrier?: string;
  /** Earliest delivery time (ISO 8601) */
  earliest_fulfillment_time?: string;
  /** Latest delivery time (ISO 8601) */
  latest_fulfillment_time?: string;
  /** Cost breakdown */
  totals: Total[];
}

/**
 * Message severity for checkout messages
 * See: https://ucp.dev/specification/checkout#message
 */
export type CheckoutMessageSeverity =
  | 'recoverable'
  | 'requires_buyer_input'
  | 'requires_buyer_review';

/**
 * Message type
 */
export type CheckoutMessageType = 'error' | 'warning' | 'info';

/**
 * Content type for messages
 */
export type ContentType = 'plain' | 'markdown';

/**
 * Error message in checkout response
 */
export interface CheckoutMessageError {
  type: 'error';
  /** Error code (e.g., 'missing', 'invalid', 'payment_declined') */
  code: string;
  /** Severity level */
  severity: CheckoutMessageSeverity;
  /** Human-readable message */
  content: string;
  /** JSONPath to the affected field */
  path?: string;
  /** Content format */
  content_type?: ContentType;
}

/**
 * Warning message in checkout response
 */
export interface CheckoutMessageWarning {
  type: 'warning';
  /** Warning code */
  code: string;
  /** Human-readable message */
  content: string;
  /** JSONPath to the affected field */
  path?: string;
  /** Content format */
  content_type?: ContentType;
}

/**
 * Info message in checkout response
 */
export interface CheckoutMessageInfo {
  type: 'info';
  /** Optional info code */
  code?: string;
  /** Human-readable message */
  content: string;
  /** JSONPath to the related field */
  path?: string;
  /** Content format */
  content_type?: ContentType;
}

/**
 * A message in the checkout response
 * See: https://ucp.dev/specification/checkout#message
 */
export type CheckoutMessage = CheckoutMessageError | CheckoutMessageWarning | CheckoutMessageInfo;

/**
 * Checkout session response
 * See: https://ucp.dev/specification/checkout#checkout-response
 */
export interface CheckoutResponse {
  /** Session identifier */
  id: string;
  /** Current session status */
  status: CheckoutStatus;
  /** Currency for the session (ISO 4217) */
  currency: CurrencyCode;
  /** Line items in the cart */
  line_items: LineItem[];
  /** Totals breakdown (required in spec) */
  totals: Total[];
  /** Legal/policy links (required in spec) */
  links: Link[];
  /** Payment configuration (required in spec) */
  payment: PaymentResponse;
  /** Buyer information */
  buyer?: Buyer;
  /** URL for buyer handoff (when status is requires_escalation) */
  continue_url?: string;
  /** Session expiration timestamp (RFC 3339) */
  expires_at?: string;
  /** Messages (errors, warnings, info) */
  messages?: CheckoutMessage[];
  /** Order details (populated after completion) */
  order?: OrderReference;
  /** Available fulfillment options */
  fulfillment_options?: FulfillmentOption[];
  /** Selected fulfillment option ID */
  selected_fulfillment_id?: string;
  /** Shipping address */
  shipping_address?: PostalAddress;
}

/**
 * Checkout session with discount extension
 */
export interface CheckoutWithDiscounts extends CheckoutResponse {
  /** Discount extension data */
  'dev.ucp.shopping.discount'?: DiscountResponse;
}

/**
 * Create checkout request
 */
export interface CreateCheckoutRequest {
  /** Currency for the session (ISO 4217) */
  currency: CurrencyCode;
  /** Line items to add */
  line_items: LineItemRequest[];
  /** Buyer information */
  buyer?: Buyer;
  /** Shipping address */
  shipping_address?: PostalAddress;
  /** Selected fulfillment option ID */
  selected_fulfillment_id?: string;
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
  line_items?: LineItemRequest[];
  /** Updated buyer information */
  buyer?: Buyer;
  /** Updated shipping address */
  shipping_address?: PostalAddress;
  /** Updated fulfillment selection */
  selected_fulfillment_id?: string;
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
