import Link from 'next/link';
import type { ReactNode } from 'react';
import { OSSBadge } from '@/components/oss-badge';
import { AuthorBadge } from '@/components/author-badge';
import { UCPBadge } from '@/components/ucp-badge';

export function Hero(): ReactNode {
  return (
    <section className="hero" data-mode="editorial">
      <div className="hero-badges">
        <OSSBadge />
        <UCPBadge />
      </div>
      <h1 className="hero-title">guardrail-sim</h1>
      <p className="hero-subtitle">
        Policy simulation for agentic commerce. Test discount rules, validate AI agent requests, and
        enforce pricing guardrails before they hit production.
      </p>
      <div className="hero-meta">
        <code className="hero-install">npm install @guardrail-sim/core</code>
        <AuthorBadge />
      </div>
      <div className="hero-actions">
        <Link href="/docs/getting-started" className="btn-primary">
          Get Started
        </Link>
        <Link href="/docs/examples/discount-stacking" className="btn-secondary">
          See Examples
        </Link>
      </div>
    </section>
  );
}
