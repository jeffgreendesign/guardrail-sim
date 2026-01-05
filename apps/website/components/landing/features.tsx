import type { ReactNode } from 'react';
import { FileCode, Zap, Shield, Cpu } from 'lucide-react';

const features = [
  {
    icon: FileCode,
    title: 'Declarative Policies',
    description: 'Define rules as data, not code. Version, test, and deploy with confidence.',
  },
  {
    icon: Zap,
    title: 'Instant Simulation',
    description: 'Test scenarios in milliseconds. No database, no side effects.',
  },
  {
    icon: Shield,
    title: 'Catch Edge Cases',
    description:
      'Discover stacking bugs, constraint conflicts, and policy gaps before customers do.',
  },
  {
    icon: Cpu,
    title: 'MCP Integration',
    description: 'Use with Claude and other AI assistants. Natural language policy testing.',
  },
] as const;

export function Features(): ReactNode {
  return (
    <section className="features-section">
      <h2 className="section-title">Why guardrail-sim?</h2>
      <div className="features-grid">
        {features.map((feature) => (
          <div key={feature.title} className="feature-card">
            <feature.icon className="feature-icon" size={24} strokeWidth={1.5} />
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-description">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
