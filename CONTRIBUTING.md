# Contributing to Guardrail-Sim

Thanks for your interest in contributing! This document outlines how to get started.

## Development Setup

### Prerequisites

- Node.js 20+ (see `.nvmrc`)
- pnpm 9+ (`corepack enable && corepack prepare pnpm@latest --activate`)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/your-org/guardrail-sim.git
cd guardrail-sim

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Required variables:

- `OPENAI_API_KEY` - For running simulations
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` - For dashboard persistence

## Project Structure

```
apps/
  dashboard/           # Next.js frontend

packages/
  policy-engine/       # Core rule evaluation (json-rules-engine)
  mcp-server/          # MCP tool interface
  simulation/          # LLM buyer persona simulation
```

## Development Workflow

### Running Commands

```bash
pnpm dev              # Start all packages in dev mode
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm lint             # Run ESLint
pnpm typecheck        # Run TypeScript checks
pnpm format           # Format with Prettier
pnpm format:check     # Check formatting
```

### Working on a Single Package

```bash
pnpm --filter @guardrail-sim/policy-engine dev
pnpm --filter @guardrail-sim/policy-engine test
```

## Making Changes

### 1. Create an Issue First

Before starting work, [open an issue](../../issues/new/choose) to discuss your proposed changes. This helps avoid duplicate work and ensures your contribution aligns with project goals.

### 2. Fork and Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 3. Make Your Changes

- Follow existing code style (enforced by ESLint/Prettier)
- Add tests for new functionality
- Update documentation if needed

### 4. Verify Your Changes

```bash
pnpm build            # Ensure it builds
pnpm test             # Ensure tests pass
pnpm lint             # Ensure no lint errors
pnpm format:check     # Ensure proper formatting
```

### 5. Submit a Pull Request

- Fill out the PR template completely
- Link to the related issue
- Ensure CI passes

## Code Style

- TypeScript for all source code
- ESLint + Prettier for formatting (run `pnpm format` before committing)
- Prefer explicit types over `any`
- Use named exports over default exports

## Testing

We use Node.js built-in test runner:

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @guardrail-sim/policy-engine test

# Run a specific test file
node --test --experimental-strip-types packages/policy-engine/test/engine.test.ts
```

## Architecture Decisions

Major technical decisions are documented in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Please read through the ADRs before proposing significant changes.

## Getting Help

- Check existing [issues](../../issues) and [discussions](../../discussions)
- Read the [documentation](docs/)
- Open a new issue if you're stuck

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
