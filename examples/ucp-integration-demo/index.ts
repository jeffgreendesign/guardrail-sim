/**
 * UCP Integration Demo
 *
 * This demo shows how guardrail-sim integrates with the Universal Commerce Protocol (UCP)
 * for agentic commerce discount validation.
 */

import {
  PolicyEngine,
  defaultPolicy,
  calculateAllocations,
  calculateMaxDiscount,
  getUCPErrorCode,
} from '@guardrail-sim/policy-engine';

import {
  toDiscountValidationResult,
  buildDiscountExtensionResponse,
  fromUCPLineItems,
} from '@guardrail-sim/ucp-types/converters';

import type { LineItem } from '@guardrail-sim/ucp-types/checkout';

// Initialize the policy engine with default policy
const engine = new PolicyEngine(defaultPolicy);

console.log('='.repeat(60));
console.log('UCP Integration Demo - guardrail-sim');
console.log('='.repeat(60));
console.log();

// Demo 1: Basic discount validation with UCP response
console.log('Demo 1: Discount Validation');
console.log('-'.repeat(40));

const order1 = {
  order_value: 5000,
  quantity: 50,
  product_margin: 0.4,
};

const result1 = await engine.evaluate(order1, 0.12);
const ucpResult1 = toDiscountValidationResult(result1);

console.log('Order:', order1);
console.log('Proposed discount: 12%');
console.log('Policy result:', result1.approved ? 'APPROVED' : 'REJECTED');
console.log('UCP validation result:', ucpResult1);
console.log();

// Demo 2: Volume tier qualification
console.log('Demo 2: Volume Tier Qualification');
console.log('-'.repeat(40));

const order2 = {
  order_value: 10000,
  quantity: 100, // Qualifies for volume tier
  product_margin: 0.4,
};

const result2 = await engine.evaluate(order2, 0.12);
const ucpResult2 = toDiscountValidationResult(result2);

console.log('Order:', order2);
console.log('Proposed discount: 12%');
console.log('Policy result:', result2.approved ? 'APPROVED' : 'REJECTED');
console.log('UCP validation result:', ucpResult2);
console.log();

// Demo 3: Discount allocations across line items
console.log('Demo 3: UCP Discount Allocations');
console.log('-'.repeat(40));

const lineItems: LineItem[] = [
  { item: { id: 'SKU-001' }, quantity: 2, subtotal: { amount: 7500, currency: 'USD' } },
  { item: { id: 'SKU-002' }, quantity: 1, subtotal: { amount: 2500, currency: 'USD' } },
];

// Convert UCP line items to order format
const order3 = fromUCPLineItems(lineItems, { productMargin: 0.4 });
console.log('Converted order from UCP line items:', order3);

// Calculate 10% discount amount
const discountAmount = order3.order_value * 0.1;
console.log('Discount amount (10%):', discountAmount);

// Allocate proportionally
const allocations = calculateAllocations(
  discountAmount,
  lineItems.map((li) => ({
    id: li.item.id,
    subtotal: li.subtotal?.amount ?? 0,
  })),
  'across'
);
console.log('Proportional allocations:', allocations);

// Allocate evenly
const evenAllocations = calculateAllocations(
  discountAmount,
  lineItems.map((li) => ({
    id: li.item.id,
    subtotal: li.subtotal?.amount ?? 0,
  })),
  'each'
);
console.log('Even allocations:', evenAllocations);
console.log();

// Demo 4: Max discount calculation
console.log('Demo 4: Maximum Discount Calculation');
console.log('-'.repeat(40));

const scenarios = [
  {
    name: 'High margin, high volume',
    order: { order_value: 10000, quantity: 150, product_margin: 0.5 },
  },
  {
    name: 'Low margin, high volume',
    order: { order_value: 10000, quantity: 150, product_margin: 0.2 },
  },
  {
    name: 'High margin, low volume',
    order: { order_value: 1000, quantity: 10, product_margin: 0.5 },
  },
];

for (const scenario of scenarios) {
  const maxDiscount = calculateMaxDiscount(scenario.order);
  console.log(`${scenario.name}:`);
  console.log(`  Max discount: ${(maxDiscount.max_discount * 100).toFixed(1)}%`);
  console.log(`  Limited by: ${maxDiscount.limiting_factor}`);
}
console.log();

// Demo 5: Full UCP discount extension response
console.log('Demo 5: Full UCP Discount Extension Response');
console.log('-'.repeat(40));

const order4 = {
  order_value: 5000,
  quantity: 100,
  product_margin: 0.4,
};

const discountResult = await engine.evaluate(order4, 0.1);
const ucpResponse = buildDiscountExtensionResponse(
  ['SUMMER20'],
  discountResult,
  500, // $5.00 discount
  'Summer Sale 10% Off'
);

console.log('UCP Discount Extension Response:');
console.log(JSON.stringify(ucpResponse, null, 2));
console.log();

// Demo 6: UCP error code mapping
console.log('Demo 6: UCP Error Code Mapping');
console.log('-'.repeat(40));

const violations = [
  'max_discount',
  'margin_floor',
  'volume_tier',
  'stacking_not_allowed',
  'discount_expired',
  'login_required',
];

for (const violation of violations) {
  const ucpCode = getUCPErrorCode(violation);
  console.log(`${violation} -> ${ucpCode}`);
}
console.log();

console.log('='.repeat(60));
console.log('Demo complete! guardrail-sim is UCP-ready.');
console.log('='.repeat(60));
