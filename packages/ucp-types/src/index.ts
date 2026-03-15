/**
 * @guardrail-sim/ucp-types
 *
 * UCP (Universal Commerce Protocol) type definitions for guardrail-sim.
 *
 * This package provides TypeScript types aligned with the UCP specification (v2026-01-11),
 * enabling guardrail-sim to integrate with the agentic commerce ecosystem.
 *
 * @see https://ucp.dev
 * @see https://github.com/Universal-Commerce-Protocol/ucp
 */

// Version constants
export {
  UCP_SPEC_VERSION,
  CHECKOUT_CAPABILITY,
  DISCOUNT_EXTENSION,
  ORDER_CAPABILITY,
  CART_CAPABILITY,
  FULFILLMENT_EXTENSION,
  IDENTITY_LINKING_CAPABILITY,
} from './versions.js';
export type { UCPCapabilityDescriptor } from './versions.js';

// Profile / Discovery types
export { compareVersions, negotiateCapabilities, profileSupportsCapability } from './profile.js';
export type {
  UCPTransportType,
  UCPServiceDeclaration,
  UCPCapabilityDeclaration,
  UCPPaymentHandlerConfig,
  UCPSigningKey,
  UCPProfile,
} from './profile.js';

// Cart types
export type {
  CartStatus,
  CartLineItem,
  CartLineItemInput,
  CartResponse,
  CreateCartRequest,
  UpdateCartRequest,
} from './cart.js';

// Discount types
export type {
  DiscountMethod,
  DiscountErrorCode,
  DiscountAllocation,
  AppliedDiscount,
  RejectedDiscount,
  DiscountRequest,
  DiscountResponse,
  MessageSeverity,
  DiscountMessageType,
  DiscountMessage,
  DiscountExtensionResponse,
  DiscountValidationResult,
} from './discount.js';

// Checkout types
export type {
  CheckoutStatus,
  CurrencyCode,
  Money,
  PostalAddress,
  Item,
  ItemReference,
  TotalType,
  Total,
  LineItem,
  LineItemRequest,
  Buyer,
  LinkType,
  Link,
  PaymentHandler,
  CardNumberType,
  CardCredential,
  TokenCredential,
  PaymentCredential,
  CardPaymentInstrument,
  PaymentInstrument,
  PaymentResponse,
  FulfillmentOption,
  CheckoutMessageSeverity,
  CheckoutMessageType,
  ContentType,
  CheckoutMessageError,
  CheckoutMessageWarning,
  CheckoutMessageInfo,
  CheckoutMessage,
  CheckoutResponse,
  CheckoutWithDiscounts,
  CreateCheckoutRequest,
  CreateCheckoutWithDiscountsRequest,
  UpdateCheckoutRequest,
  UpdateCheckoutWithDiscountsRequest,
  UCPMeta,
  MCPRequest,
  OrderReference,
  CompleteCheckoutResponse,
  FulfillmentExtensionData,
  CheckoutWithFulfillment,
} from './checkout.js';

// Identity Linking types (OAuth 2.0)
export type {
  OAuthServerMetadata,
  UCPScope,
  AuthorizationRequest,
  AuthorizationResponse,
  AuthorizationErrorResponse,
  TokenRequest,
  RefreshTokenRequest,
  TokenResponse,
  TokenErrorResponse,
  TokenRevocationRequest,
  IdentityLinkStatus,
  ClientRegistration,
} from './identity-linking.js';

// Order capability types
export type {
  OrderLineItemStatus,
  OrderQuantity,
  OrderLineItem,
  FulfillmentMethodType,
  FulfillmentExpectation,
  FulfillmentEvent,
  OrderFulfillment,
  AdjustmentStatus,
  OrderAdjustment,
  Order,
  OrderEventType,
  OrderWebhookEvent,
  OrderWebhookResponse,
  WebhookSignatureHeader,
} from './order.js';

// Converters
export {
  toUCPErrorCode,
  toUCPMessage,
  toDiscountValidationResult,
  toUCPMessages,
  createAppliedDiscount,
  createRejectedDiscount,
  fromUCPLineItems,
  buildDiscountExtensionResponse,
  calculateAllocations,
  formatMoney,
  fromUCPCartToOrder,
  toCheckoutFromCart,
} from './converters.js';
