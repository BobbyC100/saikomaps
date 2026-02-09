'use client';

import { useState } from 'react';
import styles from './DetailsCard.module.css';

interface DetailRow {
  label: string;
  value: string | JSX.Element;
}

interface DetailsCardProps {
  address?: string | null;
  neighborhood?: string | null;
  website?: string | null;
  restaurantGroupName?: string | null;
  restaurantGroupSlug?: string | null;
  serviceOptions?: string[] | null; // ['Dine-in', 'Takeout', 'Delivery']
  reservationsNote?: string | null; // 'Not accepted', 'Recommended', 'Required'
  parkingNote?: string | null;
  isAccessible?: boolean | null;
  span?: number; // Grid column span (4 or 5)
}

export function DetailsCard({
  address,
  neighborhood,
  website,
  restaurantGroupName,
  restaurantGroupSlug,
  serviceOptions,
  reservationsNote,
  parkingNote,
  isAccessible,
  span = 6,
}: DetailsCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Helper: Format website domain for display
  const formatWebsiteDomain = (url: string): string => {
    let formatted = url.replace(/^https?:\/\//, ''); // Remove protocol
    formatted = formatted.replace(/^www\./, ''); // Remove www
    
    // Special case: Keep path for link aggregators (linktree, beacons, etc)
    if (formatted.includes('linktr.ee/') || formatted.includes('beacons.ai/') || formatted.includes('link.bio/')) {
      return formatted.replace(/\/$/, ''); // Keep path, just remove trailing slash
    }
    
    // For normal domains, remove path and keep just domain (with meaningful subdomain if exists)
    formatted = formatted.split('/')[0] || formatted;
    formatted = formatted.replace(/\/$/, ''); // Remove trailing slash
    
    return formatted;
  };

  // Build rows
  const rows: DetailRow[] = [];

  // 1. Website (skip Instagram URLs entirely - Instagram belongs in Action Strip, not Details)
  if (website && !website.includes('instagram.com')) {
    const displayDomain = formatWebsiteDomain(website);
    rows.push({
      label: 'Website',
      value: (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          {displayDomain}
        </a>
      ),
    });
  }

  // 2. Part of (Restaurant Group)
  if (restaurantGroupName) {
    const groupText = `Part of the ${restaurantGroupName} family`;
    rows.push({
      label: 'Part of',
      value: restaurantGroupSlug ? (
        <a href={`/group/${restaurantGroupSlug}`} className={styles.link}>
          {groupText}
        </a>
      ) : (
        groupText
      ),
    });
  }

  // 3. Service
  if (serviceOptions && serviceOptions.length > 0) {
    rows.push({
      label: 'Service',
      value: serviceOptions.join(' · '),
    });
  }

  // 4. Reservations
  if (reservationsNote) {
    rows.push({
      label: 'Reservations',
      value: reservationsNote,
    });
  }

  // 5. Parking
  if (parkingNote) {
    rows.push({
      label: 'Parking',
      value: parkingNote,
    });
  }

  // 6. Accessibility
  if (isAccessible) {
    rows.push({
      label: 'Accessibility',
      value: 'Wheelchair accessible',
    });
  }

  // Don't render if no rows
  if (rows.length === 0) return null;

  const visibleRows = expanded ? rows : rows.slice(0, 4);
  const hasMore = rows.length > 4;

  return (
    <div 
      className={styles.detailsCard}
      style={{ gridColumn: `span ${span}` }}
    >
      {visibleRows.map((row, idx) => (
        <div key={idx} className={styles.detailRow}>
          <span className={styles.label}>{row.label}</span>
          <span className={styles.value}>{row.value}</span>
        </div>
      ))}

      {hasMore && (
        <button
          className={styles.expandButton}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : 'More details'}
        </button>
      )}
    </div>
  );
}
