/**
 * Boundary-testing scenario generators.
 *
 * Generates orders that specifically probe policy boundaries:
 * - Volume tier thresholds (qty 99/100/101)
 * - Margin floor approaches
 * - Maximum discount boundary
 */

import type { Order } from '@guardrail-sim/policy-engine';
import type { BuyerPersona } from './types.js';

/**
 * Generate orders that probe the volume tier boundary at qty=100.
 * Tests behavior at 99, 100, and 101 units.
 */
export function generateVolumeBoundaryOrders(
  baseMargin: number,
  baseOrderValue: number
): { description: string; order: Order; discount: number }[] {
  return [
    {
      description: 'Just below volume tier (qty=99, discount=12%)',
      order: {
        order_value: baseOrderValue,
        quantity: 99,
        product_margin: baseMargin,
        customer_segment: 'silver',
      },
      discount: 0.12,
    },
    {
      description: 'At volume tier boundary (qty=100, discount=12%)',
      order: {
        order_value: baseOrderValue,
        quantity: 100,
        product_margin: baseMargin,
        customer_segment: 'silver',
      },
      discount: 0.12,
    },
    {
      description: 'Just above volume tier (qty=101, discount=12%)',
      order: {
        order_value: baseOrderValue,
        quantity: 101,
        product_margin: baseMargin,
        customer_segment: 'silver',
      },
      discount: 0.12,
    },
  ];
}

/**
 * Generate orders that incrementally approach the margin floor.
 * Tests discounts that leave margins at 20%, 17%, 16%, 15.5%, 15.1%, 15%, 14.9%.
 */
export function generateMarginFloorProbes(
  productMargin: number
): { description: string; order: Order; discount: number }[] {
  const targetMargins = [0.2, 0.17, 0.16, 0.155, 0.151, 0.15, 0.149];

  return targetMargins.map((targetMargin) => {
    const discount = productMargin - targetMargin;
    return {
      description: `Margin probe: ${(discount * 100).toFixed(1)}% discount → ${(targetMargin * 100).toFixed(1)}% margin`,
      order: {
        order_value: 5000,
        quantity: 50,
        product_margin: productMargin,
        customer_segment: 'gold',
      },
      discount: Math.max(0, discount),
    };
  });
}

/**
 * Generate orders that test the maximum discount boundary.
 * Tests discounts at 23%, 24%, 24.5%, 25%, 25.1%, 26%.
 */
export function generateMaxDiscountProbes(
  highMargin: number = 0.55
): { description: string; order: Order; discount: number }[] {
  const discounts = [0.23, 0.24, 0.245, 0.25, 0.251, 0.26];

  return discounts.map((discount) => ({
    description: `Max discount probe: ${(discount * 100).toFixed(1)}% (margin=${(highMargin * 100).toFixed(0)}%)`,
    order: {
      order_value: 10000,
      quantity: 200,
      product_margin: highMargin,
      customer_segment: 'platinum',
    },
    discount,
  }));
}

/**
 * Create a persona specifically designed to probe boundary conditions.
 * Useful for targeted edge case simulation.
 */
export function createBoundaryProber(target: 'volume' | 'margin' | 'max_discount'): BuyerPersona {
  switch (target) {
    case 'volume':
      return {
        id: 'boundary-volume-prober',
        name: 'Volume Boundary Prober',
        strategy: 'adversarial',
        discountRange: { min: 0.1, max: 0.16 },
        volumeRange: { min: 95, max: 105 },
        marginRange: { min: 0.35, max: 0.45 },
        maxRounds: 3,
        adaptationRate: 0.1,
      };
    case 'margin':
      return {
        id: 'boundary-margin-prober',
        name: 'Margin Floor Prober',
        strategy: 'adversarial',
        discountRange: { min: 0.15, max: 0.28 },
        volumeRange: { min: 50, max: 150 },
        marginRange: { min: 0.2, max: 0.35 },
        maxRounds: 5,
        adaptationRate: 0.08,
      };
    case 'max_discount':
      return {
        id: 'boundary-max-discount-prober',
        name: 'Max Discount Prober',
        strategy: 'adversarial',
        discountRange: { min: 0.22, max: 0.3 },
        volumeRange: { min: 100, max: 300 },
        marginRange: { min: 0.45, max: 0.6 },
        maxRounds: 4,
        adaptationRate: 0.05,
      };
  }
}
