Run all quality gates on the codebase. Do NOT commit until every gate passes.

## Steps

1. Run the full quality suite:

```bash
pnpm quality
```

This executes: lint → typecheck → test (all packages).

2. Run the build:

```bash
pnpm build
```

3. Run workspace boundary checks (explicit re-run for visibility — already included in `pnpm quality` above):

```bash
pnpm test:boundaries
```

4. Run the security scanner:

```bash
bash scripts/security-check.sh --strict
```

5. Report results for each gate:
   - **lint** — pass / fail
   - **typecheck** — pass / fail
   - **test** — pass / fail
   - **build** — pass / fail
   - **boundaries** — pass / fail
   - **security** — pass / fail

6. If any gate fails, identify the specific errors and fix them before proceeding.

**Do NOT commit or push code until all gates pass.**
