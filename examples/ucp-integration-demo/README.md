# UCP Integration Demo

This demo shows how guardrail-sim integrates with the Universal Commerce Protocol (UCP) for agentic commerce discount validation.

## What This Demo Shows

1. **Discount Validation** - Validate discounts and get UCP-formatted responses
2. **Volume Tier Qualification** - How volume tiers affect discount eligibility
3. **Discount Allocations** - Proportional and even allocation across line items
4. **Max Discount Calculation** - Calculate maximum allowable discounts
5. **Full UCP Response** - Complete discount extension response format
6. **Error Code Mapping** - How policy violations map to UCP error codes

## Running the Demo

```bash
# From the monorepo root
pnpm install
pnpm build

# Run the demo
cd examples/ucp-integration-demo
pnpm demo
```

## Expected Output

```
============================================================
UCP Integration Demo - guardrail-sim
============================================================

Demo 1: Discount Validation
----------------------------------------
Order: { order_value: 5000, quantity: 50, product_margin: 0.4 }
Proposed discount: 12%
Policy result: REJECTED
UCP validation result: { valid: false, error_code: 'discount_code_user_ineligible', ... }

Demo 2: Volume Tier Qualification
----------------------------------------
Order: { order_value: 10000, quantity: 100, product_margin: 0.4 }
Proposed discount: 12%
Policy result: APPROVED
UCP validation result: { valid: true }

...
```

## UCP Concepts Demonstrated

### Error Codes

| guardrail-sim Violation | UCP Error Code                         |
| ----------------------- | -------------------------------------- |
| `max_discount`          | `discount_code_invalid`                |
| `margin_floor`          | `discount_code_invalid`                |
| `volume_tier`           | `discount_code_user_ineligible`        |
| `stacking_not_allowed`  | `discount_code_combination_disallowed` |
| `discount_expired`      | `discount_code_expired`                |

### Allocation Methods

- **`across`** - Proportional allocation based on line item subtotals
- **`each`** - Even split across all line items

## Resources

- [UCP Specification](https://ucp.dev/spec)
- [guardrail-sim UCP Documentation](../../docs/concepts/ucp.mdx)
