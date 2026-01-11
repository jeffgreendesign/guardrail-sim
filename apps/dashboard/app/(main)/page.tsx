import Link from 'next/link';
import { ArrowRight, Shield, Zap, BarChart3, Bot } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-ds-primary text-ds-primary grain-texture">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
          {/* Badge */}
          <div className="mb-8 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm text-accent">
              <Shield className="h-4 w-4" />
              Policy Simulation Engine
            </span>
          </div>

          {/* Main heading */}
          <h1 className="text-center text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            <span className="block">Your AI agents&apos;</span>
            <span className="block neon-glow text-accent">guardrails</span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-center text-lg text-zinc-400 font-mono">
            Everyone builds the gas pedal. This is the brakes and steering.
            <br />
            Test your AI pricing policies before they cost you millions.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/playground"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-semibold text-black transition-all hover:bg-accent/90 hover:scale-105"
            >
              Try Playground
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 font-semibold transition-all hover:border-zinc-600 hover:bg-zinc-800"
            >
              Read Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Bento Grid */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Simulate Orders */}
          <div className="glass-card p-6 transition-all hover:border-accent/30">
            <div className="mb-4 inline-flex rounded-lg bg-accent/10 p-3">
              <Zap className="h-6 w-6 text-accent" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Simulate Orders</h3>
            <p className="text-sm text-zinc-400">
              Generate thousands of synthetic orders with LLM buyer personas that try to game your
              pricing.
            </p>
          </div>

          {/* Define Policies */}
          <div className="glass-card p-6 transition-all hover:border-accent/30">
            <div className="mb-4 inline-flex rounded-lg bg-accent/10 p-3">
              <Shield className="h-6 w-6 text-accent" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Define Policies</h3>
            <p className="text-sm text-zinc-400">
              Create deterministic rules with json-rules-engine. Margin floors, discount caps,
              volume tiers.
            </p>
          </div>

          {/* Monitor Results */}
          <div className="glass-card p-6 transition-all hover:border-accent/30">
            <div className="mb-4 inline-flex rounded-lg bg-accent/10 p-3">
              <BarChart3 className="h-6 w-6 text-accent" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Monitor Results</h3>
            <p className="text-sm text-zinc-400">
              Visualize margin impact, discount distribution, and policy violations in real-time.
            </p>
          </div>

          {/* MCP Integration */}
          <div className="glass-card p-6 transition-all hover:border-accent/30">
            <div className="mb-4 inline-flex rounded-lg bg-accent/10 p-3">
              <Bot className="h-6 w-6 text-accent" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">MCP Integration</h3>
            <p className="text-sm text-zinc-400">
              Expose policies via Model Context Protocol. Your AI agents query, the engine decides.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-xl font-bold text-accent">
              1
            </div>
            <h3 className="mb-2 text-lg font-semibold">Define Policy</h3>
            <p className="text-sm text-zinc-400">
              Set your margin floors, discount caps, and volume tier rules using our visual editor
              or JSON.
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-xl font-bold text-accent">
              2
            </div>
            <h3 className="mb-2 text-lg font-semibold">Simulate Attacks</h3>
            <p className="text-sm text-zinc-400">
              LLM buyer personas attempt to extract maximum discounts. See what breaks before
              production.
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-xl font-bold text-accent">
              3
            </div>
            <h3 className="mb-2 text-lg font-semibold">Deploy Confidently</h3>
            <p className="text-sm text-zinc-400">
              Fix policy gaps, then integrate via MCP. Your AI agent queries, the engine enforces.
            </p>
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="glass-card overflow-hidden">
          <div className="border-b border-white/10 px-6 py-4">
            <span className="font-mono text-sm text-zinc-400">MCP Tool: evaluate_policy</span>
          </div>
          <pre className="overflow-x-auto p-6 font-mono text-sm">
            <code className="text-zinc-300">
              {`// AI agent calls the MCP tool
const result = await mcp.callTool({
  name: 'evaluate_policy',
  arguments: {
    order: {
      order_value: 5000,
      quantity: 100,
      product_margin: 0.4  // 40% margin
    },
    proposed_discount: 0.12  // 12% discount request
  }
});

// Deterministic response
{
  "approved": true,
  "violations": [],
  "applied_rules": ["margin_floor", "max_discount", "volume_tier"],
  "calculated_margin": 0.28  // 28% after discount
}`}
            </code>
          </pre>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-zinc-500">
          <p>Guardrail-Sim &mdash; Policy simulation for AI agent pricing governance</p>
        </div>
      </footer>
    </main>
  );
}
