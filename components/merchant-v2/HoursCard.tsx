/**
 * Tier 3 - Hours Card
 * CRITICAL: ALWAYS RENDERS (even with missing data)
 * Default: compact state (today only, no full week)
 */

'use client';

import { useState } from 'react';
import { Hours, OpenStatus } from '@/lib/types/merchant';

interface HoursCardProps {
  hours?: Hours;
  openStatus?: OpenStatus;
}

export function HoursCard({ hours, openStatus }: HoursCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasSchedule = hours && Object.keys(hours).length > 0;

  // CRITICAL: Component always renders, even with missing data
  if (!hasSchedule) {
    return (
      <div className="hours-card">
        <div className="hours-header">
          <h3 className="hours-title">Hours</h3>
        </div>
        <p className="hours-unavailable">Hours unavailable</p>
      </div>
    );
  }

  // Default: compact state (today's window only)
  return (
    <div className="hours-card">
      <div className="hours-header">
        <h3 className="hours-title">Hours</h3>
        {openStatus && (
          <span className={`open-status ${openStatus.isOpen ? 'open' : 'closed'}`}>
            {openStatus.isOpen ? 'Open' : 'Closed'}
            {openStatus.todayWindow && ` · ${openStatus.todayWindow}`}
          </span>
        )}
      </div>

      {!isExpanded && openStatus?.todayWindow && (
        <div className="hours-today">
          <p>{openStatus.todayWindow}</p>
          <button
            onClick={() => setIsExpanded(true)}
            className="hours-expand-button"
          >
            See full schedule
          </button>
        </div>
      )}

      {/* Full week schedule (only shown when expanded) */}
      {isExpanded && (
        <div className="hours-full">
          {Object.entries(hours).map(([day, time]) => (
            <div key={day} className="hours-row">
              <span className="hours-day">{day}</span>
              <span className="hours-time">{time}</span>
            </div>
          ))}
          <button
            onClick={() => setIsExpanded(false)}
            className="hours-collapse-button"
          >
            Show less
          </button>
        </div>
      )}
    </div>
  );
}
