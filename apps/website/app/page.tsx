import type { ReactNode } from 'react';
import { MakerNote } from '@/components/maker-note';
import { Hero } from '@/components/landing/hero';
import { Features } from '@/components/landing/features';
import { UseCases } from '@/components/landing/use-cases';
import { MCPShowcase } from '@/components/landing/mcp-showcase';
import { QuickStart } from '@/components/landing/quick-start';

export default function LandingPage(): ReactNode {
  return (
    <main>
      <Hero />
      <UseCases />
      <Features />
      <MCPShowcase />
      <QuickStart />
      <WhyIBuiltThis />
      <Footer />
    </main>
  );
}

function WhyIBuiltThis(): ReactNode {
  return (
    <MakerNote>
      <p className="maker-note-text">
        E-commerce discount logic is deceptively complex.{' '}
        <strong>Every rule has exceptions, every exception has edge cases.</strong>
      </p>
      <p className="maker-note-text">
        I&apos;ve seen teams accidentally stack discounts that cost thousands, or block legitimate
        promotions because the rules conflicted. Testing these scenarios manually is tedious and
        error-prone.
      </p>
      <p className="maker-note-text">
        guardrail-sim lets you define policies declaratively and simulate outcomes before they hit
        production. Think of it as unit tests for your business rules.
      </p>
    </MakerNote>
  );
}

function Footer(): ReactNode {
  return (
    <footer className="footer-attribution">
      <span>Built by</span>
      <a href="https://hirejeffgreen.com" target="_blank" rel="noopener noreferrer">
        <span className="name">Jeff Green</span>
      </a>
      <span>·</span>
      <a
        href="https://github.com/jeffgreendesign/guardrail-sim"
        target="_blank"
        rel="noopener noreferrer"
      >
        GitHub
      </a>
    </footer>
  );
}
