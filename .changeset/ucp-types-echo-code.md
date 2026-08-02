---
'@guardrail-sim/ucp-types': patch
---

`toDiscountValidationResult` now honors its `code` argument and echoes it on the
result. The parameter was accepted as `_code` and discarded, forcing callers to
re-attach the code themselves. `DiscountValidationResult` gains an optional `code`.
