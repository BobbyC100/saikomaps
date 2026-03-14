'use client';

/**
 * Admin Section Layout
 * Wraps all admin routes with a persistent sidebar nav + content area.
 * Auth enforced by middleware for /admin and /api/admin (except /admin/coverage).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const C = {
  bg: '#F5F0E1',
  text: '#36454F',
  muted: '#8B7355',
  accent: '#5BA7A7',
  border: '#C3B091',
  sidebarBg: '#2C3A3A',
  sidebarText: '#D4CFC4',
  sidebarActive: '#5BA7A7',
  sidebarHover: '#3A4E4E',
};

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: '⌂' },
  { label: 'Intake', href: '/admin/intake', icon: '＋' },
  { label: 'Coverage', href: '/admin/coverage', icon: '◉' },
  { label: 'Coverage Ops', href: '/admin/coverage-ops', icon: '⚑' },
  { label: 'Instagram', href: '/admin/instagram', icon: '◎' },
  { label: 'Photos', href: '/admin/photo-eval', icon: '▣' },
  { label: 'GPID Queue', href: '/admin/gpid-queue', icon: '⊕' },
  { label: 'Appearances', href: '/admin/appearances', icon: '◈' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: C.bg }}>
      {/* Sidebar */}
      <aside
        className="fixed top-0 left-0 h-full z-40 flex flex-col transition-all duration-200"
        style={{
          width: collapsed ? 48 : 200,
          backgroundColor: C.sidebarBg,
        }}
      >
        {/* Logo / title */}
        <div
          className="flex items-center gap-2 px-3 py-4 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.1)' }}
        >
          {!collapsed && (
            <span className="text-sm font-bold tracking-wide" style={{ color: C.sidebarText }}>
              Saiko Admin
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-xs opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: C.sidebarText }}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '▸' : '◂'}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                style={{
                  color: active ? '#fff' : C.sidebarText,
                  backgroundColor: active ? C.sidebarActive : 'transparent',
                  borderLeft: active ? '3px solid #fff' : '3px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.backgroundColor = C.sidebarHover;
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title={collapsed ? item.label : undefined}
              >
                <span className="text-base leading-none w-5 text-center">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main
        className="flex-1 min-h-screen transition-all duration-200"
        style={{ marginLeft: collapsed ? 48 : 200 }}
      >
        {children}
      </main>
    </div>
  );
}
