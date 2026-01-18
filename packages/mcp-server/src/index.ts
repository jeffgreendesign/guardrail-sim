#!/usr/bin/env node
/**
 * @guardrail-sim/mcp-server
 *
 * MCP server exposing policy evaluation tools for AI agents.
 * Provides deterministic policy evaluation through the evaluate_policy tool.
 */

import { fileURLToPath } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { PolicyEngine, defaultPolicy } from '@guardrail-sim/policy-engine';
import type { Order, Policy, EvaluationResult } from '@guardrail-sim/policy-engine';
import {
  toDiscountValidationResult,
  buildDiscountExtensionResponse,
  fromUCPLineItems,
  calculateAllocations,
} from '@guardrail-sim/ucp-types';
import type {
  DiscountValidationResult,
  DiscountExtensionResponse,
  LineItem,
} from '@guardrail-sim/ucp-types';

export const VERSION = '0.0.1';

// Initialize policy engine with default policy
const currentPolicy: Policy = defaultPolicy;
const policyEngine = new PolicyEngine(currentPolicy);

/**
 * Tool definitions for the MCP server
 */
const TOOLS = [
  {
    name: 'evaluate_policy',
    description: `Evaluate a proposed discount against the active pricing policy.

Use this tool when:
- A B2B buyer requests a discount
- You need to check if a discount is allowed before committing
- You want to understand the policy constraints for negotiation

Returns: approval status, violations, applied rules, and calculated margin.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        order: {
          type: 'object' as const,
          description: 'The order details for evaluation',
          properties: {
            order_value: {
              type: 'number' as const,
              description: 'Total order value in dollars',
            },
            quantity: {
              type: 'number' as const,
              description: 'Total units in the order',
            },
            customer_segment: {
              type: 'string' as const,
              description: 'Customer tier/segment (e.g., new, bronze, silver, gold, platinum)',
            },
            product_margin: {
              type: 'number' as const,
              description: 'Base margin as decimal (0.40 = 40%)',
            },
          },
          required: ['order_value', 'quantity', 'product_margin'],
        },
        proposed_discount: {
          type: 'number' as const,
          description: 'Requested discount as decimal (0.15 = 15% off)',
        },
      },
      required: ['order', 'proposed_discount'],
    },
  },
  {
    name: 'get_policy_summary',
    description: `Get a human-readable summary of the active policy rules.

Use this tool when:
- You need to explain discount limits to a buyer
- You want to understand what discounts are possible
- Preparing for a negotiation`,
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_max_discount',
    description: `Calculate the maximum allowed discount for a given order.

Use this tool when:
- You want to know the ceiling for negotiation
- A buyer asks "what's the best you can do?"`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        order: {
          type: 'object' as const,
          description: 'The order details',
          properties: {
            order_value: {
              type: 'number' as const,
              description: 'Total order value in dollars',
            },
            quantity: {
              type: 'number' as const,
              description: 'Total units in the order',
            },
            customer_segment: {
              type: 'string' as const,
              description: 'Customer tier/segment',
            },
            product_margin: {
              type: 'number' as const,
              description: 'Base margin as decimal (0.40 = 40%)',
            },
          },
          required: ['order_value', 'quantity', 'product_margin'],
        },
      },
      required: ['order'],
    },
  },
  // UCP-aligned tools
  {
    name: 'validate_discount_code',
    description: `Validate a discount code against the active policy before submitting to checkout.

UCP-compatible tool that returns standard UCP error codes.

Use this tool when:
- An AI agent wants to pre-validate a discount before checkout
- You need UCP-compliant error codes for discount rejection
- Building UCP-compatible checkout flows`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        code: {
          type: 'string' as const,
          description: 'The discount code to validate',
        },
        discount_amount: {
          type: 'number' as const,
          description: 'The discount amount in minor currency units (cents)',
        },
        order: {
          type: 'object' as const,
          description: 'Order context for validation',
          properties: {
            order_value: {
              type: 'number' as const,
              description: 'Total order value in dollars',
            },
            quantity: {
              type: 'number' as const,
              description: 'Total units in the order',
            },
            customer_segment: {
              type: 'string' as const,
              description: 'Customer tier/segment',
            },
            product_margin: {
              type: 'number' as const,
              description: 'Base margin as decimal (0.40 = 40%)',
            },
          },
          required: ['order_value', 'quantity', 'product_margin'],
        },
      },
      required: ['code', 'discount_amount', 'order'],
    },
  },
  {
    name: 'simulate_checkout_discount',
    description: `Simulate a UCP checkout with discount codes applied.

Returns a UCP-compatible discount extension response with applied discounts,
allocations, and any rejection messages.

Use this tool when:
- Testing how discounts would be applied in a UCP checkout
- Simulating multi-code discount scenarios
- Validating discount stacking behavior`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        codes: {
          type: 'array' as const,
          items: { type: 'string' as const },
          description: 'Array of discount codes to apply',
        },
        line_items: {
          type: 'array' as const,
          description: 'UCP line items for the checkout',
          items: {
            type: 'object' as const,
            properties: {
              item: {
                type: 'object' as const,
                properties: {
                  id: { type: 'string' as const },
                },
                required: ['id'],
              },
              quantity: { type: 'number' as const },
              subtotal: {
                type: 'object' as const,
                properties: {
                  amount: { type: 'number' as const, description: 'Amount in minor units (cents)' },
                  currency: { type: 'string' as const },
                },
              },
            },
            required: ['item', 'quantity'],
          },
        },
        currency: {
          type: 'string' as const,
          description: 'ISO 4217 currency code (e.g., USD)',
        },
        discount_percentage: {
          type: 'number' as const,
          description: 'Discount percentage to simulate (0.15 = 15%)',
        },
        product_margin: {
          type: 'number' as const,
          description: 'Base margin for policy evaluation (0.40 = 40%)',
        },
      },
      required: ['codes', 'line_items', 'currency', 'discount_percentage'],
    },
  },
];

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
  const ruleDescriptions = currentPolicy.rules.map((rule) => {
    let description = '';
    switch (rule.name) {
      case 'margin_floor':
        description = 'Ensures minimum margin of 15% is maintained after discount';
        break;
      case 'max_discount':
        description = 'Maximum discount cap of 25% regardless of other factors';
        break;
      case 'volume_tier':
        description = 'Orders with quantity < 100 are limited to 10% discount';
        break;
      default:
        description = `Rule: ${rule.name}`;
    }
    return { name: rule.name, description };
  });

  const summary = `
Policy: ${currentPolicy.name}
Rules:
1. Margin Floor (15%): Discounts cannot reduce margin below 15%
2. Max Discount (25%): No discount can exceed 25% regardless of other factors
3. Volume Tier: Orders with 100+ units qualify for higher discounts (up to 15% vs 10% base)

To maximize discount approval:
- Increase order quantity to 100+ units for volume tier benefits
- Consider products with higher base margins
- Stay within the 25% maximum cap
`.trim();

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

  // Calculate constraints
  const marginFloor = 0.15;
  const maxDiscountCap = 0.25;
  const volumeThreshold = 100;
  const baseDiscountLimit = 0.1;
  const volumeDiscountLimit = 0.15;

  // Maximum discount based on margin floor
  const marginBasedMax = order.product_margin - marginFloor;

  // Maximum based on volume tier
  const volumeBasedMax =
    order.quantity >= volumeThreshold ? volumeDiscountLimit : baseDiscountLimit;

  // Take the minimum of all constraints
  const constraints = [
    { name: 'margin_floor', value: marginBasedMax },
    { name: 'max_discount_cap', value: maxDiscountCap },
    { name: 'volume_tier', value: volumeBasedMax },
  ];

  const minConstraint = constraints.reduce((min, c) => (c.value < min.value ? c : min));
  const maxDiscount = Math.max(0, Math.min(...constraints.map((c) => c.value)));

  let details = '';
  if (minConstraint.name === 'margin_floor') {
    details = `Limited by margin floor: ${(order.product_margin * 100).toFixed(0)}% margin - 15% floor = ${(marginBasedMax * 100).toFixed(0)}% max discount`;
  } else if (minConstraint.name === 'max_discount_cap') {
    details = 'Limited by absolute discount cap of 25%';
  } else {
    details =
      order.quantity >= volumeThreshold
        ? 'Volume tier (100+ units) allows up to 15% discount'
        : 'Base tier (< 100 units) limited to 10% discount';
  }

  return {
    max_discount: maxDiscount,
    max_discount_pct: `${(maxDiscount * 100).toFixed(1)}%`,
    limiting_factor: minConstraint.name,
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
  line_items: LineItem[];
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

  // Calculate discount amount in minor units
  const discountAmount = Math.round(order.order_value * args.discount_percentage * 100);

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
 * Create and configure the MCP server
 */
export function createServer(): Server {
  const server = new Server(
    {
      name: 'guardrail-sim',
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'evaluate_policy': {
          const typedArgs = args as { order: Order; proposed_discount: number };
          const result = await handleEvaluatePolicy(typedArgs);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'get_policy_summary': {
          const result = handleGetPolicySummary();
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'get_max_discount': {
          const typedArgs = args as { order: Order };
          const result = await handleGetMaxDiscount(typedArgs);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        // UCP-aligned tools
        case 'validate_discount_code': {
          const typedArgs = args as {
            code: string;
            discount_amount: number;
            order: Order;
          };
          const result = await handleValidateDiscountCode(typedArgs);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'simulate_checkout_discount': {
          const typedArgs = args as {
            codes: string[];
            line_items: LineItem[];
            currency: string;
            discount_percentage: number;
            product_margin?: number;
          };
          const result = await handleSimulateCheckoutDiscount(typedArgs);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        default:
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: true,
                  code: 'UNKNOWN_TOOL',
                  message: `Unknown tool: ${name}`,
                }),
              },
            ],
            isError: true,
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: true,
              code: 'TOOL_ERROR',
              message: errorMessage,
            }),
          },
        ],
        isError: true,
      };
    }
  });

  // Handle list resources request
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: 'guardrail://policies/active',
        name: 'Active Policy',
        description: 'The currently active pricing policy configuration',
        mimeType: 'application/json',
      },
    ],
  }));

  // Handle read resource request
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === 'guardrail://policies/active') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(currentPolicy, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  });

  return server;
}

/**
 * Run the MCP server with stdio transport
 */
async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Keep the process alive
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
}

// Run only when executed directly (not when imported as a library)
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
