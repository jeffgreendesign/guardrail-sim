import type { ReactNode } from 'react';

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
    title: 'Category Exclusions',
    description: 'Are clearance items eligible for this promo?',
    code: `evaluate(policy, {
  discounts: [{ type: 'coupon', value: 30 }],
  item: { category: 'clearance' },
})`,
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
            <pre className="use-case-code">
              <code>{useCase.code}</code>
            </pre>
          </div>
        ))}
      </div>
    </section>
  );
}
