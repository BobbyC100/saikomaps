/**
 * Admin Index — directory of all admin tools.
 */

import Link from 'next/link';

const tools = [
  {
    section: 'Operations',
    items: [
      { href: '/admin/coverage-ops', label: 'Coverage Ops', description: 'Triage board, discovery, merge, bulk actions' },
      { href: '/admin/coverage', label: 'Coverage Audit', description: 'Data quality metrics and field completion reports' },
      { href: '/admin/review', label: 'Review Queue', description: 'Pending reviews and approvals' },
      { href: '/admin/intake', label: 'Intake', description: 'Add new places — single or CSV batch' },
      { href: '/admin/appearances', label: 'Appearances', description: 'Place appearances and mentions' },
    ],
  },
  {
    section: 'Signals & Scoring',
    items: [
      { href: '/admin/energy', label: 'Energy Scores', description: 'Energy score dashboard' },
      { href: '/admin/energy/inspect', label: 'Energy Inspector', description: 'Per-place energy signal drill-down' },
      { href: '/admin/photo-eval', label: 'Photo Eval', description: 'Photo quality evaluation' },
    ],
  },
  {
    section: 'Identity & Social',
    items: [
      { href: '/admin/identity/gpid-queue', label: 'GPID Queue', description: 'Google Place ID matching queue' },
      { href: '/admin/instagram', label: 'Instagram', description: 'Instagram enrichment admin' },
      { href: '/admin/actors/submit-url', label: 'Submit Actor URL', description: 'Add actor by URL' },
    ],
  },
];

export default function AdminIndexPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-bold text-stone-900 mb-2">Admin Tools</h1>
      <p className="text-stone-500 mb-10 text-sm">All internal tools in one place.</p>

      {tools.map((section) => (
        <div key={section.section} className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
            {section.section}
          </h2>
          <div className="space-y-2">
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg border border-stone-200 bg-white px-4 py-3 hover:border-stone-400 hover:shadow-sm transition-all"
              >
                <span className="font-medium text-stone-900">{item.label}</span>
                <span className="ml-2 text-sm text-stone-400">{item.description}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
