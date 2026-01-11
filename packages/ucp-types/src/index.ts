/**
 * @guardrail-sim/ucp-types
 *
 * UCP (Universal Commerce Protocol) type definitions for guardrail-sim.
 *
 * This package provides TypeScript types aligned with the UCP specification,
 * enabling guardrail-sim to integrate with the agentic commerce ecosystem.
 *
 * @see https://ucp.dev
 * @see https://github.com/Universal-Commerce-Protocol/ucp
 */

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
  Item,
  LineItem,
  Buyer,
  TotalType,
  Total,
  CheckoutResponse,
  CheckoutWithDiscounts,
  CheckoutMessageSeverity,
  CheckoutMessage,
  CreateCheckoutRequest,
  CreateCheckoutWithDiscountsRequest,
  UpdateCheckoutRequest,
  UpdateCheckoutWithDiscountsRequest,
  UCPMeta,
  MCPRequest,
  OrderReference,
  CompleteCheckoutResponse,
} from './checkout.js';

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
} from './converters.js';
