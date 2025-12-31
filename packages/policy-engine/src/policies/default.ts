import type { Policy } from '../types.js';

export const defaultPolicy = {
  id: 'default',
  name: 'Default Pricing Policy',
  rules: [
    {
      name: 'margin_floor',
      conditions: {
        all: [
          {
            fact: 'calculated_margin',
            operator: 'lessThan',
            value: 0.15,
          },
        ],
      },
      event: {
        type: 'violation',
        params: {
          rule: 'margin_floor',
          message: 'Calculated margin falls below 15% floor',
        },
      },
      priority: 10,
    },
    {
      name: 'max_discount',
      conditions: {
        all: [
          {
            fact: 'proposed_discount',
            operator: 'greaterThan',
            value: 0.25,
          },
        ],
      },
      event: {
        type: 'violation',
        params: {
          rule: 'max_discount',
          message: 'Discount exceeds maximum allowed 25%',
        },
      },
      priority: 10,
    },
    {
      name: 'volume_tier',
      conditions: {
        all: [
          {
            fact: 'proposed_discount',
            operator: 'greaterThan',
            value: 0.1,
          },
          {
            any: [
              {
                fact: 'quantity',
                operator: 'lessThan',
                value: 100,
              },
              {
                fact: 'proposed_discount',
                operator: 'greaterThan',
                value: 0.15,
              },
            ],
          },
        ],
      },
      event: {
        type: 'violation',
        params: {
          rule: 'volume_tier',
          message: 'Discount exceeds tier limit (10% base, 15% for qty >= 100)',
        },
      },
      priority: 5,
    },
  ],
} as const satisfies Policy;
