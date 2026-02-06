'use client';

import { useState } from 'react';
import type { CSVParseResult } from '@/types/import';

interface PreviewTableProps {
  parseResult: CSVParseResult;
  onDownloadErrors?: () => void;
}

export default function PreviewTable({ parseResult, onDownloadErrors }: PreviewTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLocations = parseResult.locations.filter(loc =>
    loc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-bg-secondary border border-border-light rounded-lg p-4">
          <div className="text-xs text-text-tertiary uppercase mb-1">Total Rows</div>
          <div className="text-3xl font-serif font-semibold">{parseResult.totalRows}</div>
        </div>
        <div className="bg-bg-secondary border border-border-light rounded-lg p-4">
          <div className="text-xs text-text-tertiary uppercase mb-1">Valid</div>
          <div className="text-3xl font-serif font-semibold text-success">{parseResult.validRows}</div>
        </div>
        <div className="bg-bg-secondary border border-border-light rounded-lg p-4">
          <div className="text-xs text-text-tertiary uppercase mb-1">Invalid</div>
          <div className="text-3xl font-serif font-semibold text-error">{parseResult.invalidRows}</div>
        </div>
        <div className="bg-bg-secondary border border-border-light rounded-lg p-4">
          <div className="text-xs text-text-tertiary uppercase mb-1">Duplicates</div>
          <div className="text-3xl font-serif font-semibold">{parseResult.duplicateRows}</div>
        </div>
      </div>

      {/* Errors Summary */}
      {parseResult.errors.length > 0 && (
        <div className="bg-bg-secondary border border-error rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-error">{parseResult.errors.length} Errors Found</h3>
            {onDownloadErrors && (
              <button onClick={onDownloadErrors} className="text-sm text-accent-primary hover:underline">
                Download Report
              </button>
            )}
          </div>
          <ul className="space-y-1 text-sm text-text-secondary">
            {parseResult.errors.slice(0, 5).map((error, idx) => (
              <li key={idx}>Row {error.row}: {error.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Search */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search locations..."
          className="w-full px-4 py-2 bg-bg-tertiary border border-border-light rounded-lg"
        />
      </div>

      {/* Table */}
      <div className="bg-bg-secondary border border-border-light rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-tertiary border-b border-border-light">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Row</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Note</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {filteredLocations.map((location) => (
              <tr key={location.id} className="hover:bg-bg-tertiary/50">
                <td className="px-6 py-4 text-sm text-text-tertiary">{location.rowNumber}</td>
                <td className="px-6 py-4 text-sm text-text-primary font-medium">{location.title}</td>
                <td className="px-6 py-4 text-sm text-text-secondary">{location.note || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    location.isValid ? 'bg-green-100 text-success' : 'bg-red-100 text-error'
                  }`}>
                    {location.isValid ? 'Valid' : 'Invalid'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
