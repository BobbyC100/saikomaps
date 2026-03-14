import Link from 'next/link';

/**
 * Admin Dashboard — /admin
 * Central hub for all admin tools.
 */

const C = {
  bg: '#F5F0E1',
  text: '#36454F',
  muted: '#8B7355',
  accent: '#5BA7A7',
  border: '#C3B091',
};

interface ToolCard {
  title: string;
  description: string;
  href: string;
  icon: string;
}

const TOOLS: ToolCard[] = [
  {
    title: 'Place Intake',
    description: 'Add new places one at a time or batch import via CSV. Auto-dedup and enrichment.',
    href: '/admin/intake',
    icon: '＋',
  },
  {
    title: 'Coverage Dashboard',
    description: 'Track enrichment tiers, missing fields, neighborhood breakdown, and problem records.',
    href: '/admin/coverage',
    icon: '◉',
  },
  {
    title: 'Coverage Operations',
    description: 'Triage board for entity issues. Fix identity, location, contact, and social problems.',
    href: '/admin/coverage-ops',
    icon: '⚑',
  },
  {
    title: 'Instagram Backfill',
    description: 'Find and add missing Instagram handles to existing places.',
    href: '/admin/instagram',
    icon: '◎',
  },
  {
    title: 'Photo Evaluation',
    description: 'Tag and evaluate place photos by tier and type. Default and editorial modes.',
    href: '/admin/photo-eval',
    icon: '▣',
  },
  {
    title: 'GPID Queue',
    description: 'Approve or reject Google Place ID matches for entities missing GPIDs.',
    href: '/admin/gpid-queue',
    icon: '⊕',
  },
  {
    title: 'Appearances',
    description: 'Create pop-up and mobile appearance records for places.',
    href: '/admin/appearances',
    icon: '◈',
  },
];

export default function AdminDashboard() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: C.text }}>Admin Dashboard</h1>
        <p className="mt-1 text-sm" style={{ color: C.muted }}>
          Central hub for all Saiko Maps admin tools.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group block rounded-lg border p-5 transition-all hover:shadow-md"
            style={{
              borderColor: C.border,
              backgroundColor: '#fff',
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none mt-0.5">{tool.icon}</span>
              <div>
                <h2
                  className="text-sm font-semibold group-hover:underline"
                  style={{ color: C.accent }}
                >
                  {tool.title}
                </h2>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: C.muted }}>
                  {tool.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
