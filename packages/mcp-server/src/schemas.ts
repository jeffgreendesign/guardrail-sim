/**
 * Zod schemas for every MCP tool's input and output.
 *
 * Declaring `outputSchema` alongside `inputSchema` lets the server return
 * `structuredContent`, so an agent gets a machine-readable payload instead of
 * having to parse JSON out of a text block.
 */

import { z } from 'zod';

// ============================================================================
// SHARED SHAPES
// ============================================================================

export const orderSchema = z
  .object({
    order_value: z.number().describe('Total order value in dollars'),
    quantity: z.number().describe('Total units in the order'),
    customer_segment: z
      .string()
      .optional()
      .describe('Customer tier/segment (e.g., new, bronze, silver, gold, platinum)'),
    product_margin: z.number().describe('Base margin as decimal (0.40 = 40%)'),
  })
  .describe('The order details for evaluation');

const violationSchema = z.object({
  rule: z.string(),
  message: z.string(),
  ucp_error_code: z.string().optional(),
});

export const moneySchema = z.object({
  amount: z.number(),
  currency: z.string(),
});

/**
 * A UCP line item as supplied on a checkout request.
 *
 * `title` and `price` are required by the spec's Item and by checkout-store,
 * which rejects bare item references. The schema is loose so additional Item
 * fields (description, image_url) survive rather than being silently stripped.
 */
const lineItemRequestSchema = z.object({
  item: z.looseObject({
    id: z.string(),
    title: z.string().describe('Item name/title'),
    price: z.number().describe('Unit price in minor currency units (cents)'),
  }),
  quantity: z.number().int().positive(),
});

/**
 * Field names mirror the `Buyer` and `PostalAddress` types in ucp-types exactly.
 *
 * These schemas previously used invented names (`name`, `line_one`, `city`, `state`,
 * `country`), and because `z.object` strips unknown keys, a client sending spec-correct
 * UCP address fields had every one of them silently dropped before the session was stored.
 */
const buyerSchema = z.object({
  email: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  full_name: z.string().optional(),
  phone_number: z.string().describe('E.164 format').optional(),
});

const postalAddressSchema = z.object({
  street_address: z.string().optional(),
  extended_address: z.string().describe('Apt, suite, etc.').optional(),
  address_locality: z.string().describe('City/locality').optional(),
  address_region: z.string().describe('State/province/region').optional(),
  address_country: z.string().describe('ISO 3166-1 alpha-2 country code').optional(),
  postal_code: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  full_name: z.string().optional(),
  phone_number: z.string().describe('E.164 format').optional(),
});

const discountExtensionInput = z
  .object({ codes: z.array(z.string()) })
  .describe('UCP discount extension: codes to apply');

const ucpMetaSchema = z.object({
  ucp: z.object({ profile: z.string().optional() }).optional(),
});

/** A checkout session as returned by the checkout tools. */
const checkoutSessionSchema = z.looseObject({
  id: z.string(),
  status: z.string(),
  currency: z.string(),
});

// ============================================================================
// TOOL INPUT SCHEMAS
// ============================================================================

export const evaluatePolicyInput = z.object({
  order: orderSchema,
  proposed_discount: z.number().describe('Requested discount as decimal (0.15 = 15% off)'),
});

export const getPolicySummaryInput = z.object({});

export const getMaxDiscountInput = z.object({ order: orderSchema });

export const validateDiscountCodeInput = z.object({
  code: z.string().describe('The discount code to validate'),
  discount_amount: z.number().describe('The discount amount in minor currency units (cents)'),
  order: orderSchema.describe('Order context for validation'),
});

/**
 * A UCP checkout line item. `subtotal` is a Money object in minor units, and
 * `totals` is the newer per-line breakdown; both are accepted, matching what
 * `getLineItemSubtotal` in ucp-types reads.
 */
const ucpLineItemSchema = z.looseObject({
  item: z.looseObject({ id: z.string() }),
  quantity: z.number(),
  subtotal: moneySchema.optional().describe('Line total in minor units (cents)'),
  totals: z
    .array(z.looseObject({ type: z.string(), amount: z.number() }))
    .optional()
    .describe('Per-line totals breakdown'),
});

export const simulateCheckoutDiscountInput = z.object({
  codes: z.array(z.string()).describe('Array of discount codes to apply'),
  line_items: z.array(ucpLineItemSchema).describe('UCP line items for the checkout'),
  currency: z.string().describe('ISO 4217 currency code (e.g., USD)'),
  discount_percentage: z.number().describe('Discount to apply as decimal (0.15 = 15%)'),
  product_margin: z.number().optional().describe('Base margin for policy evaluation (0.40 = 40%)'),
});

export const runSimulationInput = z.object({
  orders_per_persona: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe('Negotiation sessions per persona (1-50, default 10)'),
  personas: z
    .array(z.string())
    .optional()
    .describe('Persona ids to run; defaults to all built-in personas'),
  seed: z.number().optional().describe('PRNG seed for reproducible runs (default 42)'),
});

export const analyzeSimulationInput = z.object({
  orders_per_persona: z.number().int().min(1).max(50).optional(),
  seed: z.number().optional(),
});

export const createCheckoutInput = z.object({
  checkout: z.object({
    currency: z.string(),
    line_items: z.array(lineItemRequestSchema),
    buyer: buyerSchema.optional(),
    shipping_address: postalAddressSchema.optional(),
    'dev.ucp.shopping.discount': discountExtensionInput.optional(),
  }),
  idempotency_key: z.string().optional(),
  _meta: ucpMetaSchema.optional(),
});

export const getCheckoutInput = z.object({
  id: z.string().describe('Checkout session id'),
});

export const updateCheckoutInput = z.object({
  id: z.string().describe('Checkout session id'),
  checkout: z.object({
    line_items: z.array(lineItemRequestSchema).optional(),
    buyer: buyerSchema.optional(),
    shipping_address: postalAddressSchema.optional(),
    'dev.ucp.shopping.discount': discountExtensionInput.optional(),
  }),
  _meta: ucpMetaSchema.optional(),
});

export const completeCheckoutInput = z.object({
  id: z.string().describe('Checkout session id'),
  idempotency_key: z.string().optional(),
});

export const cancelCheckoutInput = completeCheckoutInput;

// ============================================================================
// TOOL OUTPUT SCHEMAS
// ============================================================================

export const evaluatePolicyOutput = z.object({
  approved: z.boolean(),
  violations: z.array(violationSchema),
  notices: z.array(violationSchema).optional(),
  applied_rules: z.array(z.string()),
  calculated_margin: z.number(),
  policy_id: z.string(),
  policy_name: z.string(),
});

export const getPolicySummaryOutput = z.object({
  policy_id: z.string(),
  policy_name: z.string(),
  rules: z.array(z.object({ name: z.string(), description: z.string() })),
  summary: z.string(),
});

export const getMaxDiscountOutput = z.object({
  max_discount: z.number(),
  max_discount_pct: z.string(),
  limiting_factor: z.string(),
  details: z.string(),
});

export const validateDiscountCodeOutput = z.object({
  code: z.string(),
  valid: z.boolean(),
  error_code: z.string().optional(),
  message: z.string().optional(),
  max_allowed: z.number().optional(),
  limiting_factor: z.string().optional(),
});

export const simulateCheckoutDiscountOutput = z.looseObject({
  currency: z.string(),
  applied: z.array(
    z.object({
      code: z.string(),
      amount: z.number(),
      method: z.string().optional(),
    })
  ),
  messages: z
    .array(z.object({ type: z.string(), code: z.string().optional(), text: z.string().optional() }))
    .optional(),
  allocations: z.array(z.object({ target: z.string(), amount: z.number() })).optional(),
});

const outcomeCountsSchema = z.object({
  accepted: z.number(),
  rejected: z.number(),
  abandoned: z.number(),
});

export const runSimulationOutput = z.object({
  totalSessions: z.number(),
  totalEvaluations: z.number(),
  approvalRate: z.number(),
  averageDiscountApproved: z.number(),
  averageDiscountRequested: z.number(),
  averageMarginAfterDiscount: z.number(),
  violationsByRule: z.record(z.string(), z.number()),
  outcomesByPersona: z.record(z.string(), outcomeCountsSchema),
  limitingFactors: z.record(z.string(), z.number()),
  edgeCasesFound: z.array(
    z.object({
      description: z.string(),
      severity: z.string(),
    })
  ),
  seed: z.number(),
  persona_count: z.number(),
});

export const analyzeSimulationOutput = z.object({
  metrics: z.looseObject({
    totalSessions: z.number(),
    totalEvaluations: z.number(),
    approvalRate: z.number(),
  }),
  insights: z.object({
    total: z.number(),
    critical: z.number(),
    warnings: z.number(),
    items: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        severity: z.string(),
        message: z.string().optional(),
      })
    ),
  }),
});

export const checkoutOutput = z.object({ checkout: checkoutSessionSchema });
