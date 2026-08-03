#!/usr/bin/env node
/**
 * @guardrail-sim/mcp-server
 *
 * MCP server exposing policy evaluation tools for AI agents.
 * Provides deterministic policy evaluation through the evaluate_policy tool.
 *
 * Targets the 2026-07-28 protocol revision via the v2 SDK's `serveStdio` entry,
 * which also serves 2025-era clients from the same registrations.
 */

import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
import {
  PolicyEngine,
  calculateMaxDiscount,
  defaultPolicy,
  extractPolicyThresholds,
} from '@guardrail-sim/policy-engine';
import type { Order, Policy, EvaluationResult } from '@guardrail-sim/policy-engine';
import {
  toDiscountValidationResult,
  buildDiscountExtensionResponse,
  fromUCPLineItems,
  calculateAllocations,
  serializeProfile,
} from '@guardrail-sim/ucp-types';
import type {
  DiscountValidationResult,
  DiscountExtensionResponse,
  LineItem,
  LineItemRequest,
  Buyer,
  PostalAddress,
} from '@guardrail-sim/ucp-types';
import {
  createCheckoutSession,
  getCheckoutSession,
  updateCheckoutSession,
  completeCheckoutSession,
  cancelCheckoutSession,
  recomputeSessionTotals,
} from './checkout-store.js';
import { runSimulation, defaultPersonas, toSimulationSummary } from '@guardrail-sim/simulation';
import type { SimulationMetrics } from '@guardrail-sim/simulation';
import { analyzePolicy } from '@guardrail-sim/insights';
import * as schema from './schemas.js';

export const VERSION = '0.4.0';

const __filename = fileURLToPath(import.meta.url);

// Initialize policy engine with default policy
const currentPolicy: Policy = defaultPolicy;
const policyEngine = new PolicyEngine(currentPolicy);

/**
 * Handle evaluate_policy tool call
 */
async function handleEvaluatePolicy(args: {
  order: Order;
  proposed_discount: number;
}): Promise<EvaluationResult & { policy_id: string; policy_name: string }> {
  const result = await policyEngine.evaluate(args.order, args.proposed_discount);

  return {
    ...result,
    policy_id: currentPolicy.id,
    policy_name: currentPolicy.name,
  };
}

/**
 * Handle get_policy_summary tool call
 */
function handleGetPolicySummary(): {
  policy_id: string;
  policy_name: string;
  rules: Array<{
    name: string;
    description: string;
  }>;
  summary: string;
} {
  // Descriptions and the summary are generated from the policy's own thresholds.
  // They were previously hardcoded to the default policy's 15%/25%/100-unit numbers,
  // so any custom policy was described with limits it does not have.
  const { marginFloor, maxDiscount, volumeTiers } = extractPolicyThresholds(currentPolicy);
  const pct = (v: number): string => `${(v * 100).toFixed(0)}%`;

  const ruleDescriptions = currentPolicy.rules.map((rule) => {
    let description: string;
    switch (rule.name) {
      case 'margin_floor':
        description =
          marginFloor !== undefined
            ? `Ensures minimum margin of ${pct(marginFloor)} is maintained after discount`
            : 'Enforces a minimum margin after discount';
        break;
      case 'max_discount':
        description =
          maxDiscount !== undefined
            ? `Maximum discount cap of ${pct(maxDiscount)} regardless of other factors`
            : 'Caps the absolute discount regardless of other factors';
        break;
      case 'volume_tier': {
        const base = volumeTiers.find((t) => t.minQuantity === 0);
        const stepped = volumeTiers.filter((t) => t.minQuantity > 0);
        description = stepped.length
          ? `Orders below ${stepped[0].minQuantity} units are limited to ${pct(base?.maxDiscount ?? 0)} discount`
          : 'Limits discounts by order quantity';
        break;
      }
      default:
        description = `Rule: ${rule.name}`;
    }
    return { name: rule.name, description };
  });

  const ruleLines = ruleDescriptions.map((r, i) => `${i + 1}. ${r.name}: ${r.description}`);

  const guidance: string[] = [];
  for (const tier of volumeTiers.filter((t) => t.minQuantity > 0)) {
    guidance.push(
      `- Increase order quantity to ${tier.minQuantity}+ units for up to ${pct(tier.maxDiscount)}`
    );
  }
  if (marginFloor !== undefined) {
    guidance.push('- Consider products with higher base margins');
  }
  if (maxDiscount !== undefined) {
    guidance.push(`- Stay within the ${pct(maxDiscount)} maximum cap`);
  }

  const summary = [
    `Policy: ${currentPolicy.name}`,
    'Rules:',
    ...ruleLines,
    ...(guidance.length ? ['', 'To maximize discount approval:', ...guidance] : []),
  ]
    .join('\n')
    .trim();

  return {
    policy_id: currentPolicy.id,
    policy_name: currentPolicy.name,
    rules: ruleDescriptions,
    summary,
  };
}

/**
 * Handle get_max_discount tool call
 */
async function handleGetMaxDiscount(args: { order: Order }): Promise<{
  max_discount: number;
  max_discount_pct: string;
  limiting_factor: string;
  details: string;
}> {
  const { order } = args;

  // Thresholds come from the active policy, never from constants duplicated here —
  // otherwise a custom policy gets answered with the default policy's numbers.
  const policy = policyEngine.getPolicy();
  const { max_discount, limiting_factor } = calculateMaxDiscount(order, policy);
  const { marginFloor, maxDiscount, volumeTiers } = extractPolicyThresholds(policy);

  let details: string;
  switch (limiting_factor) {
    case 'margin_floor':
      details = `Limited by margin floor: ${(order.product_margin * 100).toFixed(0)}% margin - ${((marginFloor ?? 0) * 100).toFixed(0)}% floor = ${(max_discount * 100).toFixed(0)}% max discount`;
      break;
    case 'max_discount':
      details = `Limited by absolute discount cap of ${((maxDiscount ?? 0) * 100).toFixed(0)}%`;
      break;
    case 'volume_tier': {
      const tier = [...volumeTiers]
        .filter((t) => order.quantity >= t.minQuantity)
        .sort((a, b) => b.minQuantity - a.minQuantity)[0];
      details = tier
        ? `Volume tier (${tier.minQuantity}+ units) allows up to ${(tier.maxDiscount * 100).toFixed(0)}% discount`
        : `Volume tier limits this order to ${(max_discount * 100).toFixed(0)}%`;
      break;
    }
    default:
      details =
        'Policy "' +
        policy.name +
        '" states no recognizable discount limit, so no headroom can be confirmed.';
  }

  return {
    max_discount,
    max_discount_pct: `${(max_discount * 100).toFixed(1)}%`,
    limiting_factor,
    details,
  };
}

/**
 * Handle validate_discount_code tool call (UCP-aligned)
 */
async function handleValidateDiscountCode(args: {
  code: string;
  discount_amount: number;
  order: Order;
}): Promise<DiscountValidationResult & { code: string }> {
  // Guard against division by zero and convert discount amount (cents) to percentage of order value
  // discount_amount is in cents, order_value is in dollars
  // Formula: (discount_amount in cents) / (order_value in dollars * 100 cents/dollar)
  const orderValueInCents = args.order.order_value * 100;
  const discountPercentage = orderValueInCents > 0 ? args.discount_amount / orderValueInCents : 0;

  const evaluation = await policyEngine.evaluate(args.order, discountPercentage);
  const result = toDiscountValidationResult(evaluation, args.code);

  // Calculate max allowed if rejected
  if (!result.valid) {
    const maxResult = await handleGetMaxDiscount({ order: args.order });
    result.max_allowed = Math.round(args.order.order_value * maxResult.max_discount * 100); // in cents
    result.limiting_factor = maxResult.limiting_factor;
  }

  return {
    ...result,
    code: args.code,
  };
}

/**
 * Handle simulate_checkout_discount tool call (UCP-aligned)
 */
async function handleSimulateCheckoutDiscount(args: {
  codes: string[];
  // Both converters below accept the union, and the tool only ever required
  // `item` + `quantity` — the narrower LineItem here was never enforced.
  line_items: (LineItem | LineItemRequest)[];
  currency: string;
  discount_percentage: number;
  product_margin?: number;
}): Promise<
  DiscountExtensionResponse & {
    currency: string;
    allocations?: Array<{ target: string; amount: number }>;
  }
> {
  // Convert UCP line items to guardrail-sim order
  const order = fromUCPLineItems(args.line_items, {
    productMargin: args.product_margin ?? 0.3,
  });

  // Evaluate against policy
  const evaluation = await policyEngine.evaluate(order, args.discount_percentage);

  // `fromUCPLineItems` sums line-item subtotals, which UCP states in MINOR units, so
  // order_value is already cents here. Multiplying by 100 again inflated every discount
  // by 100x. Contrast handleValidateDiscountCode, whose `order` argument is documented in
  // dollars and therefore does need the conversion.
  const discountAmount = Math.round(order.order_value * args.discount_percentage);

  // Build UCP-compatible response
  const response = buildDiscountExtensionResponse(
    args.codes,
    evaluation,
    discountAmount,
    `${(args.discount_percentage * 100).toFixed(0)}% Discount`
  );

  // Calculate allocations if approved
  let allocations: Array<{ target: string; amount: number }> | undefined;
  if (evaluation.approved && args.line_items.length > 0) {
    allocations = calculateAllocations(discountAmount, args.line_items, 'across');

    // Update applied discounts with allocations
    if (response.applied.length > 0) {
      response.applied[0].allocations = allocations;
    }
  }

  return {
    ...response,
    currency: args.currency,
    allocations,
  };
}

/**
 * Handle run_simulation tool call
 */
async function handleRunSimulation(args: {
  orders_per_persona?: number;
  personas?: string[];
  seed?: number;
}): Promise<SimulationMetrics & { seed: number; persona_count: number }> {
  const ordersPerPersona = Math.min(args.orders_per_persona ?? 20, 50);
  const seed = args.seed ?? 42;

  // Filter personas if specific ones requested
  let personas = defaultPersonas;
  if (args.personas && args.personas.length > 0) {
    personas = defaultPersonas.filter((p) => args.personas!.includes(p.id));
    if (personas.length === 0) {
      throw new Error(
        `No matching personas found. Available: ${defaultPersonas.map((p) => p.id).join(', ')}`
      );
    }
  }

  const results = await runSimulation({
    policy: currentPolicy,
    personas,
    ordersPerPersona,
    seed,
  });

  return {
    ...results.metrics,
    seed,
    persona_count: personas.length,
  };
}

/**
 * Handle analyze_simulation tool call
 */
async function handleAnalyzeSimulation(args: {
  orders_per_persona?: number;
  seed?: number;
}): Promise<{
  metrics: SimulationMetrics;
  insights: {
    total: number;
    critical: number;
    warnings: number;
    items: Array<{ id: string; title: string; severity: string; message: string }>;
  };
}> {
  const ordersPerPersona = Math.min(args.orders_per_persona ?? 20, 50);
  const seed = args.seed ?? 42;

  const results = await runSimulation({
    policy: currentPolicy,
    personas: defaultPersonas,
    ordersPerPersona,
    seed,
  });

  const summary = toSimulationSummary(results);

  // Build policy summary for insights (must match PolicySummary interface)
  const policySummary = {
    id: currentPolicy.id,
    name: currentPolicy.name,
    ruleCount: currentPolicy.rules.length,
    rules: currentPolicy.rules.map((r) => ({
      name: r.name,
      priority: r.priority ?? 0,
      conditionCount: Object.keys(r.conditions).length,
      eventType: r.event.type,
    })),
    hasMarginFloor: currentPolicy.rules.some((r) => r.name === 'margin_floor'),
    hasMaxDiscountCap: currentPolicy.rules.some((r) => r.name === 'max_discount'),
    hasVolumeTiers: currentPolicy.rules.some((r) => r.name === 'volume_tier'),
    hasSegmentRules: false,
  };

  const report = await analyzePolicy({
    policy: policySummary,
    simulationResults: summary,
  });

  return {
    metrics: results.metrics,
    insights: {
      total: report.summary.total,
      critical: report.summary.critical,
      warnings: report.summary.warning,
      items: report.insights
        .filter((r) => r.triggered)
        .map((r) => ({
          id: r.insight.id,
          title: r.insight.title,
          severity: r.insight.severity,
          message: r.message ?? r.insight.description,
        })),
    },
  };
}

/**
 * Validate checkout input fields for create/update operations
 */
function validateCheckoutInput(
  checkout: Record<string, unknown>,
  requireLineItems: boolean
): string | null {
  if (requireLineItems) {
    if (!checkout.currency || typeof checkout.currency !== 'string') {
      return 'currency is required and must be a string';
    }
    if (!Array.isArray(checkout.line_items) || checkout.line_items.length === 0) {
      return 'line_items must be a non-empty array';
    }
  }
  if (Array.isArray(checkout.line_items)) {
    for (const li of checkout.line_items as Array<Record<string, unknown>>) {
      if (!li.item || typeof li.item !== 'object') return 'each line item must have an item object';
      if (typeof li.quantity !== 'number' || li.quantity < 1 || !Number.isInteger(li.quantity)) {
        return 'each line item quantity must be a positive integer';
      }
    }
  }
  return null;
}

// ============================================================================
// CHECKOUT TOOL HANDLERS
// ============================================================================

/** Raised by a handler to signal a tool-level failure with a stable code. */
class ToolFailure extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ToolFailure';
  }
}

/**
 * The flat rate this MVP grants for any recognized code. Real implementations resolve a
 * rate per code; this is deliberately a single rate for the whole basket, which is why the
 * amount below is computed once and then split across the codes rather than per code.
 */
const CHECKOUT_DISCOUNT_RATE = 0.1;

/** Apply discount codes to a session, replacing any previously stored response. */
async function applyDiscountCodes(
  session: Awaited<ReturnType<typeof getCheckoutSession>> & object,
  codes: string[]
): Promise<void> {
  const order = fromUCPLineItems(session.line_items);
  const evaluation = await policyEngine.evaluate(order, CHECKOUT_DISCOUNT_RATE);
  // order_value comes from line-item subtotals and is already in minor units.
  session['dev.ucp.shopping.discount'] = buildDiscountExtensionResponse(
    codes,
    evaluation,
    Math.round(order.order_value * CHECKOUT_DISCOUNT_RATE)
  );
  // A discount changes the receipt, so totals must follow. Under 2026-04-08 the
  // discount lands in totals[] as a negative entry and reduces `total`.
  recomputeSessionTotals(session);
}

async function handleCreateCheckout(args: {
  checkout: {
    currency: string;
    line_items: LineItemRequest[];
    buyer?: Buyer;
    shipping_address?: PostalAddress;
    'dev.ucp.shopping.discount'?: { codes: string[] };
  };
  idempotency_key?: string;
}): Promise<{ checkout: unknown }> {
  const validationError = validateCheckoutInput(
    args.checkout as unknown as Record<string, unknown>,
    true
  );
  if (validationError) throw new ToolFailure('VALIDATION_ERROR', validationError);

  const { session, isNew } = createCheckoutSession({
    currency: args.checkout.currency,
    line_items: args.checkout.line_items,
    buyer: args.checkout.buyer,
    shipping_address: args.checkout.shipping_address,
    idempotency_key: args.idempotency_key,
  });

  // Only evaluate discounts on new sessions (preserve idempotency)
  if (isNew) {
    const codes = args.checkout['dev.ucp.shopping.discount']?.codes;
    if (codes?.length) await applyDiscountCodes(session, codes);
  }

  return { checkout: session };
}

function handleGetCheckout(args: { id: string }): { checkout: unknown } {
  const session = getCheckoutSession(args.id);
  if (!session) throw new ToolFailure('NOT_FOUND', `Checkout session not found: ${args.id}`);
  return { checkout: session };
}

async function handleUpdateCheckout(args: {
  id: string;
  checkout: {
    line_items?: LineItemRequest[];
    buyer?: Buyer;
    shipping_address?: PostalAddress;
    'dev.ucp.shopping.discount'?: { codes: string[] };
  };
}): Promise<{ checkout: unknown }> {
  const validationError = validateCheckoutInput(
    args.checkout as unknown as Record<string, unknown>,
    false
  );
  if (validationError) throw new ToolFailure('VALIDATION_ERROR', validationError);

  const session = updateCheckoutSession(args.id, {
    line_items: args.checkout.line_items,
    buyer: args.checkout.buyer,
    shipping_address: args.checkout.shipping_address,
  });

  // Re-evaluate discounts: caller-provided codes take priority, but also
  // re-evaluate existing codes when line_items change.
  const requested = args.checkout['dev.ucp.shopping.discount'];
  const existing = session['dev.ucp.shopping.discount'];

  if (requested?.codes !== undefined) {
    if (requested.codes.length === 0) {
      delete session['dev.ucp.shopping.discount'];
      recomputeSessionTotals(session);
    } else {
      await applyDiscountCodes(session, requested.codes);
    }
  } else if (existing && args.checkout.line_items) {
    await applyDiscountCodes(session, existing.codes);
  }

  return { checkout: session };
}

function handleCompleteCheckout(args: { id: string; idempotency_key?: string }): {
  checkout: unknown;
} {
  return { checkout: completeCheckoutSession(args.id, args.idempotency_key) };
}

function handleCancelCheckout(args: { id: string; idempotency_key?: string }): {
  checkout: unknown;
} {
  return { checkout: cancelCheckoutSession(args.id, args.idempotency_key) };
}

// ============================================================================
// SERVER
// ============================================================================

/**
 * Wrap a handler's plain result into a CallToolResult.
 *
 * Every tool returns both `structuredContent` (machine-readable, validated
 * against the tool's `outputSchema`) and a text block carrying the same JSON,
 * so 2025-era clients that only read `content` keep working.
 */
function ok(payload: unknown): {
  content: { type: 'text'; text: string }[];
  structuredContent: Record<string, unknown>;
} {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload as Record<string, unknown>,
  };
}

/** Wrap a thrown handler error into an isError CallToolResult. */
function fail(error: unknown): {
  content: { type: 'text'; text: string }[];
  isError: true;
} {
  const code = error instanceof ToolFailure ? error.code : 'TOOL_ERROR';
  const message = error instanceof Error ? error.message : 'Unknown error';
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: true, code, message }) }],
    isError: true,
  };
}

/** Run a handler, converting a thrown error into an isError result. */
async function run<T>(fn: () => T | Promise<T>): Promise<ReturnType<typeof ok | typeof fail>> {
  try {
    return ok(await fn());
  } catch (error) {
    return fail(error);
  }
}

/**
 * Create and configure the MCP server.
 *
 * Tools are registered in a fixed order. The 2026-07-28 revision asks servers to
 * return `tools/list` deterministically so clients can cache it and keep LLM
 * prompt-cache hits, and registration order is what determines that order here.
 */
export function createServer(): McpServer {
  const server = new McpServer(
    { name: 'guardrail-sim', version: VERSION },
    {
      capabilities: { tools: {}, resources: {} },
      // The tool and resource lists are static for the process lifetime, so they
      // are safe for shared caches. Anything reading checkout-store state is not.
      cacheHints: {
        'tools/list': { ttlMs: 3_600_000, cacheScope: 'public' },
        'resources/list': { ttlMs: 3_600_000, cacheScope: 'public' },
        'resources/read': { ttlMs: 60_000, cacheScope: 'private' },
        'server/discover': { ttlMs: 3_600_000, cacheScope: 'public' },
      },
    }
  );

  server.registerTool(
    'evaluate_policy',
    {
      description: `Evaluate a proposed discount against the active pricing policy.

Use this tool when:
- A B2B buyer requests a discount
- You need to check if a discount is allowed before committing
- You want to understand the policy constraints for negotiation

Returns: approval status, violations, applied rules, and calculated margin.`,
      inputSchema: schema.evaluatePolicyInput,
      outputSchema: schema.evaluatePolicyOutput,
    },
    (args) => run(() => handleEvaluatePolicy(args as { order: Order; proposed_discount: number }))
  );

  server.registerTool(
    'get_policy_summary',
    {
      description: `Get a human-readable summary of the active policy rules.

Use this tool when:
- You need to explain discount limits to a buyer
- You want to understand what discounts are possible
- Preparing for a negotiation`,
      inputSchema: schema.getPolicySummaryInput,
      outputSchema: schema.getPolicySummaryOutput,
    },
    () => run(() => handleGetPolicySummary())
  );

  server.registerTool(
    'get_max_discount',
    {
      description: `Calculate the maximum allowed discount for a given order.

Use this tool when:
- You want to know the ceiling for negotiation
- A buyer asks "what's the best you can do?"

Thresholds are read from the active policy, so the ceiling always matches what
evaluate_policy will actually approve.`,
      inputSchema: schema.getMaxDiscountInput,
      outputSchema: schema.getMaxDiscountOutput,
    },
    (args) => run(() => handleGetMaxDiscount(args as { order: Order }))
  );

  server.registerTool(
    'validate_discount_code',
    {
      description: `Validate a discount code against the active policy before submitting to checkout.

UCP-compatible tool that returns standard UCP error codes.

Use this tool when:
- An AI agent wants to pre-validate a discount before checkout
- You need UCP-compliant error codes for discount rejection
- Building UCP-compatible checkout flows`,
      inputSchema: schema.validateDiscountCodeInput,
      outputSchema: schema.validateDiscountCodeOutput,
    },
    (args) =>
      run(() =>
        handleValidateDiscountCode(args as { code: string; discount_amount: number; order: Order })
      )
  );

  server.registerTool(
    'simulate_checkout_discount',
    {
      description: `Simulate a UCP checkout with discount codes applied.

Returns a UCP-compatible discount extension response with applied discounts,
allocations, and any rejection messages.

Use this tool when:
- Testing how discounts would be applied in a UCP checkout
- Simulating multi-code discount scenarios
- Validating discount stacking behavior`,
      inputSchema: schema.simulateCheckoutDiscountInput,
      outputSchema: schema.simulateCheckoutDiscountOutput,
    },
    (args) =>
      run(() =>
        handleSimulateCheckoutDiscount(
          args as {
            codes: string[];
            line_items: (LineItem | LineItemRequest)[];
            currency: string;
            discount_percentage: number;
            product_margin?: number;
          }
        )
      )
  );

  server.registerTool(
    'run_simulation',
    {
      description: `Run adversarial buyer personas against the active policy.

Deterministic given a seed: the same seed always produces the same result.

Use this tool when:
- Stress-testing a policy before deployment
- Measuring approval rates and margin impact at scale
- Finding the edge cases a policy handles badly`,
      inputSchema: schema.runSimulationInput,
      outputSchema: schema.runSimulationOutput,
    },
    (args) =>
      run(() =>
        handleRunSimulation(
          args as { orders_per_persona?: number; personas?: string[]; seed?: number }
        )
      )
  );

  server.registerTool(
    'analyze_simulation',
    {
      description: `Run a simulation and analyze the results for policy health insights.

Use this tool when:
- You want recommendations, not just raw metrics
- Reviewing a policy before deployment`,
      inputSchema: schema.analyzeSimulationInput,
      outputSchema: schema.analyzeSimulationOutput,
    },
    (args) =>
      run(() => handleAnalyzeSimulation(args as { orders_per_persona?: number; seed?: number }))
  );

  server.registerTool(
    'create_checkout',
    {
      description: `Create a UCP checkout session, optionally applying discount codes.

Idempotent when an idempotency_key is supplied.`,
      inputSchema: schema.createCheckoutInput,
      outputSchema: schema.checkoutOutput,
    },
    (args) => run(() => handleCreateCheckout(args as Parameters<typeof handleCreateCheckout>[0]))
  );

  server.registerTool(
    'get_checkout',
    {
      description: 'Retrieve a UCP checkout session by id.',
      inputSchema: schema.getCheckoutInput,
      outputSchema: schema.checkoutOutput,
    },
    (args) => run(() => handleGetCheckout(args as { id: string }))
  );

  server.registerTool(
    'update_checkout',
    {
      description: `Update a UCP checkout session. Discounts are re-evaluated when codes or
line items change.`,
      inputSchema: schema.updateCheckoutInput,
      outputSchema: schema.checkoutOutput,
    },
    (args) => run(() => handleUpdateCheckout(args as Parameters<typeof handleUpdateCheckout>[0]))
  );

  server.registerTool(
    'complete_checkout',
    {
      description: 'Complete a UCP checkout session, producing an order reference.',
      inputSchema: schema.completeCheckoutInput,
      outputSchema: schema.checkoutOutput,
    },
    (args) => run(() => handleCompleteCheckout(args as { id: string; idempotency_key?: string }))
  );

  server.registerTool(
    'cancel_checkout',
    {
      description: 'Cancel a UCP checkout session.',
      inputSchema: schema.cancelCheckoutInput,
      outputSchema: schema.checkoutOutput,
    },
    (args) => run(() => handleCancelCheckout(args as { id: string; idempotency_key?: string }))
  );

  server.registerResource(
    'active-policy',
    'guardrail://policies/active',
    {
      title: 'Active Policy',
      description: 'The currently active pricing policy configuration',
      mimeType: 'application/json',
      cacheHint: { ttlMs: 3_600_000, cacheScope: 'public' },
    },
    (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(currentPolicy, null, 2),
        },
      ],
    })
  );

  server.registerResource(
    'ucp-profile',
    'guardrail://profile/well-known-ucp',
    {
      title: 'UCP Profile',
      description: 'The /.well-known/ucp profile this server advertises',
      mimeType: 'application/json',
      cacheHint: { ttlMs: 3_600_000, cacheScope: 'public' },
    },
    (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          // Serialized from the ucp-types constants, so there is no on-disk
          // fixture to miss in a published tarball and no fallback to drift.
          text: serializeProfile(),
        },
      ],
    })
  );

  return server;
}

async function main(): Promise<void> {
  // serveStdio owns era negotiation: it answers server/discover, stamps
  // resultType and cache fields, and pins one instance per connection.
  //
  // legacy: 'serve' is set explicitly rather than left to the default. Every MCP
  // client in the wild today opens with a 2025-era `initialize`, so rejecting
  // those would break `npx @guardrail-sim/mcp-server` for existing users.
  serveStdio(() => createServer(), {
    legacy: 'serve',
    onerror: (error) => {
      process.stderr.write(`[guardrail-sim] ${error.message}\n`);
    },
  });

  process.stderr.write(`guardrail-sim MCP server ${VERSION} running on stdio\n`);
}

// Only run main when executed directly (not when imported).
// realpathSync resolves the npx symlink so the check holds for `npx guardrail-mcp`.
const isMain = ((): boolean => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(__filename);
  } catch {
    return false;
  }
})();

if (isMain) {
  main().catch((error: unknown) => {
    process.stderr.write(`Fatal error: ${String(error)}\n`);
    process.exit(1);
  });
}
