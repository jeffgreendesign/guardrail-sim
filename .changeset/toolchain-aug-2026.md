---
'@guardrail-sim/policy-engine': patch
'@guardrail-sim/insights': patch
'@guardrail-sim/simulation': patch
'@guardrail-sim/ucp-types': patch
'@guardrail-sim/mcp-server': patch
---

Move the toolchain to the Aug 2026 baseline: TypeScript 6.0, ESLint 10,
typescript-eslint 8.65, c8 12, `@types/node` 24, and Node 24 LTS.

TypeScript 7 is deliberately not adopted: `typescript-eslint@8.65.0` declares
`typescript >=4.8.4 <6.1.0`, so installing TS 7 breaks linting entirely. 6.0.3 is the
newest release that keeps the lint pipeline working.

`get_policy_summary` now generates its rule descriptions and summary from the active
policy's thresholds. It previously hardcoded the default policy's 15%/25%/100-unit
numbers, so a custom policy was described with limits it does not have.
