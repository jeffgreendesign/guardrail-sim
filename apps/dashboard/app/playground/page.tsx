import { Metadata } from 'next';
import { PolicyPlayground } from './policy-playground';

export const metadata: Metadata = {
  title: 'Playground',
  description: 'Interactive policy evaluation playground',
};

export default function PlaygroundPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="text-lg font-bold">
              <span className="text-accent">Guardrail</span>-Sim
            </a>
            <nav className="flex gap-6 text-sm">
              <a href="/docs" className="text-zinc-400 hover:text-white">
                Docs
              </a>
              <a href="/playground" className="text-accent">
                Playground
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Policy Playground</h1>
          <p className="mt-2 text-zinc-400">
            Test discount requests against the policy engine in real-time. This runs the actual MCP
            server in your browser.
          </p>
        </div>

        <PolicyPlayground />
      </div>
    </main>
  );
}
