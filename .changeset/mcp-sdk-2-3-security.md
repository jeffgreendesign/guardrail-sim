---
'@guardrail-sim/mcp-server': patch
---

Raise the `@modelcontextprotocol/server` and `@modelcontextprotocol/core` floors to `^2.3.0` so installs can no longer resolve SDK versions affected by GHSA-46jr-4wx8-v453, GHSA-jm63-cq47-j5jp and GHSA-6qxp-vccf-f47h. The server runs over stdio only, so the HTTP-transport issues were not reachable through it; this keeps downstream installs off the vulnerable range.
