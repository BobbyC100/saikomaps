/**
 * Comparison Card - Side-by-side record comparison
 */

'use client';

import { FieldRow } from './FieldRow';
import { ProximityBadge } from './ProximityBadge';
import { haversineDistance } from '@/lib/haversine';
import type { HydratedRecord } from '@/lib/review-queue';

interface ComparisonCardProps {
  recordA: HydratedRecord;
  recordB: HydratedRecord;
  matchConfidence: number;
  conflictingFields: Record<string, [string, string]>;
}

export function ComparisonCard({ 
  recordA, 
  recordB, 
  matchConfidence,
  conflictingFields 
}: ComparisonCardProps) {
  
  const safeA = recordA ?? ({} as HydratedRecord);
  const safeB = recordB ?? ({} as HydratedRecord);

  // Calculate distance between the two locations
  const distanceMeters = haversineDistance(
    Number((safeA as any)?.lat ?? 0),
    Number((safeA as any)?.lng ?? 0),
    Number((safeB as any)?.lat ?? 0),
    Number((safeB as any)?.lng ?? 0)
  );
  
  // Define fields to compare
  const fields: Array<{
    label: string;
    valA: string | null | undefined;
    valB: string | null | undefined;
    prioritySource: 'editorial' | 'google' | 'foursquare';
    showDiff?: boolean;
  }> = [
    { 
      label: 'Name', 
      valA: safeA.name, 
      valB: safeB.name,
      prioritySource: 'editorial',
      showDiff: true
    },
    { 
      label: 'Address', 
      valA: safeA.address, 
      valB: safeB.address,
      prioritySource: 'google'
    },
    { 
      label: 'Neighborhood', 
      valA: safeA.neighborhood, 
      valB: safeB.neighborhood,
      prioritySource: 'editorial'
    },
    { 
      label: 'Category', 
      valA: safeA.category, 
      valB: safeB.category,
      prioritySource: 'editorial'
    },
    { 
      label: 'Phone', 
      valA: safeA.phone, 
      valB: safeB.phone,
      prioritySource: 'google'
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      
      {/* Header with sources */}
      <div className="grid grid-cols-2 border-b border-gray-200">
        <div className="px-6 py-3 bg-gray-50">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
            {(safeA.source_name ?? 'unknown').replace('_', ' ')}
          </span>
        </div>
        <div className="px-6 py-3 bg-gray-50 border-l border-gray-200">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
            {(safeB.source_name ?? 'unknown').replace('_', ' ')}
          </span>
        </div>
      </div>
      
      {/* Field comparisons */}
      <div className="divide-y divide-gray-100">
        {fields.map(field => (
          <FieldRow 
            key={field.label}
            label={field.label}
            valA={field.valA}
            valB={field.valB}
            prioritySource={field.prioritySource}
            sourceA={safeA.source_name ?? 'unknown'}
            sourceB={safeB.source_name ?? 'unknown'}
          />
        ))}
      </div>
      
      {/* Proximity + Confidence footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <ProximityBadge distanceMeters={distanceMeters} />
        <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
          {Math.round(matchConfidence * 100)}% confidence
        </span>
      </div>
    </div>
  );
}
