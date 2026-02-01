# @guardrail-sim/mcp-server

## Unreleased

### Minor Changes

- [`6af6bcd`](https://github.com/jeffgreendesign/guardrail-sim/commit/6af6bcd3cb4eb20510fe0adc96427ecbbb8947d2) - Add MCP Apps UI support with interactive evaluation and policy dashboards
  - Implement MCP Apps protocol extension for interactive UI components
  - Add evaluation-result.html UI with animated margin gauges, status badges, and interactive discount slider
  - Add policy-dashboard.html UI with animated rule cards, constraint bars, and interactive max discount calculator
  - Serve UI resources via `ui://` protocol with `_meta.ui` metadata on tools

### Patch Changes

- [`19cbae7`](https://github.com/jeffgreendesign/guardrail-sim/commit/19cbae7dbf3c0be3ba32d1cf7c34c97a24c7e65c) - Bump `@modelcontextprotocol/sdk` to ^1.25.3
- [`7fc424f`](https://github.com/jeffgreendesign/guardrail-sim/commit/7fc424f7319b79edbc021e3b17486b90f5238321) - Add c8 to package devDependencies

## 0.2.1

### Patch Changes

- [`4d1c837`](https://github.com/jeffgreendesign/guardrail-sim/commit/4d1c837d990b2f3e4705deb185aa1b892b8be129) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - Fix npx execution by resolving symlinks in main module check

## 0.2.0

### Minor Changes

- [`b7083b0`](https://github.com/jeffgreendesign/guardrail-sim/commit/b7083b0d2e9f59b05cf025b9aec1d252b02e048d) Thanks [@jeffgreendesign](https://github.com/jeffgreendesign)! - Initial public release with policy evaluation engine, MCP server, UCP types, and insights packages

### Patch Changes

- Updated dependencies [[`b7083b0`](https://github.com/jeffgreendesign/guardrail-sim/commit/b7083b0d2e9f59b05cf025b9aec1d252b02e048d)]:
  - @guardrail-sim/policy-engine@0.2.0
  - @guardrail-sim/ucp-types@0.2.0
