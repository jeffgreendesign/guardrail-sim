import './globals.css';
import { RootProvider } from 'fumadocs-ui/provider';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: {
    default: 'Guardrail-Sim',
    template: '%s | Guardrail-Sim',
  },
  description:
    'Policy simulation engine for AI agent pricing governance. Test your AI pricing policies before they cost you millions.',
  keywords: ['AI', 'pricing', 'policy', 'simulation', 'B2B', 'MCP', 'guardrails'],
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
