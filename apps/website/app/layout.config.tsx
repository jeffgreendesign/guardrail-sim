import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { AuthorBadge } from '@/components/author-badge';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: <span className="font-mono font-semibold">guardrail-sim</span>,
    children: <AuthorBadge />,
  },
  links: [
    { text: 'Docs', url: '/docs' },
    { text: 'GitHub', url: 'https://github.com/jeffgreendesign/guardrail-sim', external: true },
    { text: 'npm', url: 'https://www.npmjs.com/package/@guardrail-sim/core', external: true },
  ],
  githubUrl: 'https://github.com/jeffgreendesign/guardrail-sim',
};
