# Simulation Demo

Run adversarial buyer personas against the default pricing policy and see what breaks.

## Quick Start

From repo root:

```bash
pnpm demo
```

Or from this directory:

```bash
npx tsx index.ts
```

## What It Does

1. Spawns 5 buyer personas with different strategies:
   - **Budget Buyer** (cooperative) — requests modest discounts
   - **Strategic Buyer** (strategic) — starts high, negotiates down
   - **Margin Hunter** (adversarial) — probes the margin floor
   - **Volume Gamer** (adversarial) — games volume tier boundaries
   - **Code Stacker** (adversarial) — attempts maximum discounts

2. Each persona runs 10 negotiation sessions against the default policy

3. Reports: approval rates, margin impact, violations, edge cases, and insights

## Customization

Edit `index.ts` to change:

- `SEED` — different seed = different (but reproducible) scenarios
- `ORDERS_PER_PERSONA` — more orders = more statistical significance
- Import `createBoundaryProber` to add targeted boundary-testing personas
