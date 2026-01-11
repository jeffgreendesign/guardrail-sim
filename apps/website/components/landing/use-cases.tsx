'use client';

import type { ReactNode } from 'react';
import { CopyButton } from '@/components/copy-button';

const useCases = [
  {
    title: 'Discount Stacking',
    description: 'Can a 20% coupon combine with a site-wide sale?',
    code: `evaluate(policy, {
  discounts: [
    { type: 'coupon', value: 20 },
    { type: 'sale', value: 15 },
  ],
})`,
  },
  {
    title: 'Agent Discount Validation',
    description: 'Should we allow this AI-negotiated discount?',
    code: `// UCP-compatible validation
validate_discount_code({
  code: 'AGENT-DEAL-15',
  order: { value: 5000, margin: 0.4 },
})
// { valid: false, error_code: 'discount_code_user_ineligible' }`,
  },
  {
    title: 'Time Windows',
    description: 'Is this Black Friday deal still active?',
    code: `evaluate(policy, scenario, {
  context: {
    currentTime: new Date(),
  },
})`,
  },
] as const;

export function UseCases(): ReactNode {
  return (
    <section className="use-cases-section">
      <h2 className="section-title">Real Questions, Real Answers</h2>
      <p className="section-subtitle">Stop guessing. Start simulating.</p>
      <div className="use-cases-grid">
        {useCases.map((useCase) => (
          <div key={useCase.title} className="use-case-card">
            <h3 className="use-case-title">{useCase.title}</h3>
            <p className="use-case-description">{useCase.description}</p>
            <div className="group relative">
              <CopyButton text={useCase.code} />
              <pre className="use-case-code">
                <code>{useCase.code}</code>
              </pre>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
