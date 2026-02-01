# @guardrail-sim/insights

[![npm version](https://img.shields.io/npm/v/@guardrail-sim/insights)](https://www.npmjs.com/package/@guardrail-sim/insights)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Automated health checks for your pricing policies. Catches things like missing margin floors, overly permissive approval rates, and untested volume tiers — with actionable recommendations.

Part of [guardrail-sim](https://github.com/jeffgreendesign/guardrail-sim).

## Install

```bash
npm install @guardrail-sim/insights
```

## Quick Start

```typescript
import { analyzePolicy } from '@guardrail-sim/insights';

const report = await analyzePolicy({
  policy: {
    id: 'wholesale-v1',
    name: 'B2B Wholesale',
    ruleCount: 3,
    hasMarginFloor: true,
    marginFloorValue: 0.15,
    hasMaxDiscountCap: true,
    maxDiscountCapValue: 0.25,
    hasVolumeTiers: false,
    hasSegmentRules: false,
  },
});

// report.summary => { critical: 0, warning: 1, info: 2, total: 3 }
```

## What It Checks

24+ built-in checks across three categories:

- **Policy health** — missing rules, conflicting conditions, low margin floors
- **Margin protection** — approval rates too high/low, margin erosion trends
- **Simulation analysis** — unused rules, segment imbalances, rejection patterns

For more control, use `createRecommendationEngine(config)` to filter by category, severity, or load custom insight packs.

## Docs

- [Insights Reference](https://github.com/jeffgreendesign/guardrail-sim/blob/main/docs/packages/insights.mdx)

## License

MIT
