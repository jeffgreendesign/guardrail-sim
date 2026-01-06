import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { source } from '@/lib/source';
import { baseOptions } from '@/app/layout.config';

interface DocsLayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: DocsLayoutProps): ReactNode {
  return (
    <DocsLayout
      {...baseOptions}
      tree={source.pageTree}
      sidebar={{
        banner: (
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-mono text-fd-muted-foreground">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-fd-accent/10 text-fd-accent-foreground">
              MIT
            </span>
            <span>Policy Engine</span>
          </div>
        ),
      }}
    >
      {children}
    </DocsLayout>
  );
}
