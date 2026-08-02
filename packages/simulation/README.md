# @guardrail-sim/simulation

[![npm version](https://img.shields.io/npm/v/@guardrail-sim/simulation)](https://www.npmjs.com/package/@guardrail-sim/simulation)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Spawn LLM buyer personas that try to game your pricing policies. See what breaks before your customers do.

Part of [guardrail-sim](https://github.com/jeffgreendesign/guardrail-sim).

## What's here

- **Buyer personas** — five built-in personas spanning cooperative, strategic and adversarial
  negotiation styles (`budgetBuyer`, `strategicBuyer`, `marginHunter`, `volumeGamer`, `codeStacker`)
- **Negotiation loops** — multi-round discount negotiations against your policy engine, with
  buyers conceding between rounds and walking away when no deal is reachable
- **Edge-case probes** — volume-tier boundaries, margin-floor probes, max-discount probes
- **Metrics and insights** — approval rates, margin impact, limiting factors, and a bridge to
  `@guardrail-sim/insights` for policy health analysis

Runs offline with zero API keys. Output is deterministic given a seed: the same seed always
produces the same sessions.

## Not yet

- **LLM-backed personas.** `PersonaProvider` is the extension point; the built-in provider is
  deterministic and seeded. An LLM-backed implementation would sit behind that interface.

## License

MIT
