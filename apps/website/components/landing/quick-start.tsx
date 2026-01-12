'use client';

import type { ReactNode } from 'react';
import { CopyButton } from '@/components/copy-button';

const CODE_EXAMPLE = `import { PolicyEngine, defaultPolicy } from '@guardrail-sim/policy-engine';

const engine = new PolicyEngine(defaultPolicy);

const result = await engine.evaluate(
  { order_value: 5000, quantity: 100, product_margin: 0.4 },
  0.15  // 15% discount request
);

// result.approved: true
// result.calculated_margin: 0.25`;

export function QuickStart(): ReactNode {
  return (
    <section className="quickstart-section">
      <h2 className="section-title">Define. Simulate. Ship.</h2>
      <div className="quickstart-code group relative">
        <CopyButton text={CODE_EXAMPLE} />
        <pre>
          <code>{CODE_EXAMPLE}</code>
        </pre>
      </div>
    </section>
  );
}
