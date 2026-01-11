import type { ReactNode } from 'react';
import { Play } from 'lucide-react';
import { PolicyPlayground } from '@/components/playground/policy-playground';

export default function PlaygroundPage(): ReactNode {
  return (
    <section className="playground-section">
      <header className="playground-header">
        <span className="playground-badge">
          <span className="playground-badge-icon">
            <Play size={12} />
          </span>
          Interactive Demo
        </span>
        <h1 className="section-title">Policy Playground</h1>
        <p className="section-subtitle">
          Test discount policies in real-time. Adjust order parameters and proposed discounts to see
          how the policy engine evaluates requests.
        </p>
      </header>
      <PolicyPlayground />
    </section>
  );
}
