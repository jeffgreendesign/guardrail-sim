---
'@guardrail-sim/mcp-server': minor
---

Add MCP Apps UI support with interactive evaluation and policy dashboards

- Implement MCP Apps protocol extension for interactive UI components
- Add evaluation-result.html UI with animated margin gauges and interactive discount slider
- Add policy-dashboard.html UI with animated rule cards and interactive max discount calculator
- Serve UI resources via `ui://` protocol with `_meta.ui` metadata on tools
