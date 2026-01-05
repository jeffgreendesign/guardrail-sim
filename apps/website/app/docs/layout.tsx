import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { source } from '@/lib/source';

export default function Layout({ children }: { children: ReactNode }): ReactNode {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: <span className="font-mono font-bold">guardrail-sim</span>,
        url: '/',
      }}
      sidebar={{
        defaultOpenLevel: 1,
      }}
    >
      {children}
    </DocsLayout>
  );
}
