'use client';

import { GlobalHeader } from './GlobalHeader';
import { GlobalFooter } from './GlobalFooter';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <GlobalHeader variant="default" />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        {children}
      </main>
      <GlobalFooter variant="standard" />
    </div>
  );
}
