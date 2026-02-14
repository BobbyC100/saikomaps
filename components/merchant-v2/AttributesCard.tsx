/**
 * Tier 4 - Attributes Card
 * CRITICAL: Chip compression (max ~6 visible)
 * NO spec sheet drift (labeled rows)
 */

'use client';

import { useState } from 'react';
import { Attribute } from '@/lib/types/merchant';

interface AttributesCardProps {
  attributes: Attribute[];
}

const MAX_VISIBLE_CHIPS = 6;

export function AttributesCard({ attributes }: AttributesCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Guard: only render if attributes exist
  if (!attributes || attributes.length === 0) {
    return null;
  }

  const visibleAttributes = isExpanded 
    ? attributes 
    : attributes.slice(0, MAX_VISIBLE_CHIPS);
  
  const remainingCount = attributes.length - MAX_VISIBLE_CHIPS;
  const hasMore = remainingCount > 0;

  return (
    <div className="attributes-card">
      <h3 className="attributes-title">Details</h3>
      <div className="attributes-chips">
        {visibleAttributes.map((attr) => (
          <span key={attr.id} className="attribute-chip">
            {attr.name}
          </span>
        ))}
        {!isExpanded && hasMore && (
          <button
            onClick={() => setIsExpanded(true)}
            className="attribute-chip attribute-chip-more"
          >
            +{remainingCount} more
          </button>
        )}
      </div>
      {isExpanded && hasMore && (
        <button
          onClick={() => setIsExpanded(false)}
          className="attributes-collapse"
        >
          Show less
        </button>
      )}
    </div>
  );
}
