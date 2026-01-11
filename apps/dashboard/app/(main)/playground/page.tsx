import { Metadata } from 'next';
import { PolicyPlayground } from './policy-playground';

export const metadata: Metadata = {
  title: 'Playground',
  description: 'Interactive policy evaluation playground',
};

export default function PlaygroundPage() {
  return (
    <main className="min-h-screen bg-ds-primary text-ds-primary">
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
