/**
 * Admin Section Layout
 * Wraps all admin routes with consistent structure.
 * Auth enforced by middleware for /admin and /api/admin (except /admin/coverage).
 */

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F5F0E1]">
      {children}
    </div>
  );
}
