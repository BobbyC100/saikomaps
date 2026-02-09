/**
 * Primary Action Set Component
 * 
 * Dynamic action buttons that adapt based on intent profile.
 * Replaces the fixed Website | Instagram | Directions pattern.
 * 
 * Phase 2 Implementation:
 * - Completion action (Reserve, Call, Website, or Directions)
 * - Directions (always present)
 * - Save/Share removed (will return in Phase 4)
 * 
 * Slot Structure:
 * - Slot 1: Completion (Reserve, Call, Website, or Directions)
 * - Slot 2: Navigation or secondary (Directions, Call, Website)
 * - Slot 3: Empty (Save/Share deferred to Phase 4)
 * 
 * Result: 2 equal-width cards in horizontal row (1 for Go-There)
 */

'use client';

import { Calendar, Phone, Globe, MapPin, Bookmark, Share2 } from 'lucide-react';
import { getPrimaryActionSet, getFlatActions, type Action } from '@/lib/action-set';
import styles from './PrimaryActionSet.module.css';

interface PrimaryActionSetProps {
  place: {
    category?: string | null;
    reservationUrl?: string | null;
    phone?: string | null;
    website?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    instagram?: string | null;
    intentProfile?: string | null;
    intentProfileOverride?: boolean;
    slug?: string;
    name?: string;
  };
}

export function PrimaryActionSet({ place }: PrimaryActionSetProps) {
  const actionSet = getPrimaryActionSet(place);
  const actions = getFlatActions(actionSet);

  // Format display value for each action type
  function getDisplayValue(action: Action): string {
    switch (action.type) {
      case 'reserve':
        return 'Book a table';
      case 'call':
        return action.value || 'Call now';
      case 'website': {
        if (!action.value) return 'Visit website';
        try {
          const url = new URL(action.value.startsWith('http') ? action.value : `https://${action.value}`);
          return url.hostname.replace(/^www\./, '');
        } catch {
          return action.value.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] || 'Visit website';
        }
      }
      case 'directions': {
        // Show first line of address
        const addressShort = place.address?.replace(/,\s*USA$/i, '').trim();
        return addressShort?.split(',')[0] || 'Get directions';
      }
      case 'save':
        return 'Save place';
      case 'share':
        return 'Share';
      default:
        return action.label;
    }
  }

  // Get icon for each action type
  function getIcon(action: Action) {
    const iconProps = { size: 24, strokeWidth: 1.5 };
    switch (action.type) {
      case 'reserve':
        return <Calendar {...iconProps} />;
      case 'call':
        return <Phone {...iconProps} />;
      case 'website':
        return <Globe {...iconProps} />;
      case 'directions':
        return <MapPin {...iconProps} />;
      case 'save':
        return <Bookmark {...iconProps} />;
      case 'share':
        return <Share2 {...iconProps} />;
      default:
        return <Globe {...iconProps} />;
    }
  }

  // Handle click for each action type
  function handleClick(action: Action) {
    switch (action.type) {
      case 'reserve':
      case 'website':
      case 'directions':
        if (action.value) {
          window.open(action.value, '_blank', 'noopener,noreferrer');
        }
        break;
      case 'call':
        if (action.value) {
          window.location.href = `tel:${action.value}`;
        }
        break;
      // Save and Share removed for Phase 2
      // Will return in Phase 4 after product decisions
    }
  }

  if (actions.length === 0) {
    return null; // Should never happen - directions always present
  }

  return (
    <div className={styles.actionCardsRow}>
      {actions.map((action, index) => (
        <button
          key={`${action.type}-${index}`}
          onClick={() => handleClick(action)}
          className={styles.actionCard}
          type="button"
        >
          <span className={styles.actionIcon}>
            {getIcon(action)}
          </span>
          <span className={styles.actionDetail}>
            {getDisplayValue(action)}
          </span>
        </button>
      ))}
    </div>
  );
}
