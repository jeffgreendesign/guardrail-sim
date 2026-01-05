import type { ReactNode } from 'react';

export function QuickStart(): ReactNode {
  return (
    <section className="quickstart-section">
      <h2 className="section-title">Define. Simulate. Ship.</h2>
      <div className="quickstart-code">
        <pre>
          <code>{`import { Policy, evaluate } from '@guardrail-sim/core';

const policy: Policy = {
  name: 'max-discount',
  constraints: [
    { type: 'max_percentage', value: 40 },
  ],
};

const result = evaluate(policy, {
  discounts: [
    { type: 'coupon', value: 25 },
    { type: 'sale', value: 20 },
  ],
});

// result.allowed: false
// result.suggestion: { clampTo: 40 }`}</code>
        </pre>
      </div>
    </section>
  );
}
