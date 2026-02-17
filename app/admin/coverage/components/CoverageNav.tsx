/**
 * CoverageNav Component
 * Tab navigation for coverage audit views
 */

import Link from 'next/link';

interface CoverageNavProps {
  currentView: string;
}

const VIEWS = [
  { id: 'overview', label: 'Overview' },
  { id: 'missing', label: 'Missing Fields' },
  { id: 'neighborhoods', label: 'Neighborhoods' },
  { id: 'redflags', label: 'Red Flags' },
  { id: 'breakdown', label: 'Field Breakdown' },
];

export function CoverageNav({ currentView }: CoverageNavProps) {
  return (
    <nav className="flex space-x-1 border-b mb-6">
      {VIEWS.map((view) => {
        const isActive = currentView === view.id;
        return (
          <Link
            key={view.id}
            href={`/admin/coverage?view=${view.id}`}
            className={`
              px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${
                isActive
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }
            `}
          >
            {view.label}
          </Link>
        );
      })}
    </nav>
  );
}
