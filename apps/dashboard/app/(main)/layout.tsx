import { ReactNode } from 'react';
import { Header } from '@/components/header';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {/* Add padding-top to account for fixed header (h-16 = 4rem) */}
      <div className="pt-16">{children}</div>
    </>
  );
}
