/**
 * Admin Identity Section Layout
 * Identity → GPID Queue (first queue type)
 * Extensible: add enrichment queue, data completion queue later
 */

import Link from 'next/link';

export default function IdentityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F5F0E1]">
      <nav className="border-b border-[#C3B091]/40 bg-white/80 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-6">
          <Link
            href="/admin/review"
            className="text-sm text-[#8B7355] hover:text-[#36454F]"
          >
            Admin
          </Link>
          <span className="text-[#C3B091]">/</span>
          <span className="text-sm font-medium text-[#36454F]">Identity</span>
          <Link
            href="/admin/identity/gpid-queue"
            className="text-sm text-[#5BA7A7] hover:underline font-medium"
          >
            GPID Queue
          </Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
