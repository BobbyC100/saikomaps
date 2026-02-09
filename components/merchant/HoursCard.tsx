'use client';

import { useState } from 'react';
import styles from './HoursCard.module.css';

interface HoursCardProps {
  todayHours: string | null;
  isOpen: boolean | null;
  statusText: string | null; // "Open · Closes 12 AM"
  fullWeek: Array<{ day: string; short: string; hours: string }>;
  isIrregular: boolean;
}

export function HoursCard({
  todayHours,
  isOpen,
  statusText,
  fullWeek,
  isIrregular,
}: HoursCardProps) {
  const [expanded, setExpanded] = useState(false);

  // If irregular hours, show fallback
  if (isIrregular) {
    return (
      <div className={`${styles.hoursCard} ${styles.col2}`}>
        <div className={styles.label}>HOURS</div>
        <div className={styles.todayHours}>Hours vary</div>
      </div>
    );
  }

  return (
    <div className={`${styles.hoursCard} ${styles.col2}`}>
      {!expanded ? (
        <>
          <div className={styles.label}>HOURS</div>
          <div className={styles.todayHours}>
            {todayHours || 'Closed'}
          </div>

          {statusText && (
            <div className={styles.statusRow}>
              <span
                className={styles.statusDot}
                style={{
                  background: isOpen ? '#4A7C59' : '#36454F',
                }}
              />
              <span className={styles.statusText}>{statusText}</span>
            </div>
          )}

          {fullWeek.length > 0 && (
            <button
              className={styles.expandLink}
              onClick={() => setExpanded(true)}
            >
              See all hours
            </button>
          )}
        </>
      ) : (
        <>
          <div className={styles.label}>HOURS</div>

          <div className={styles.weekGrid}>
            {fullWeek.map((item, idx) => {
              // Get current day
              const today = new Date()
                .toLocaleDateString('en-US', { weekday: 'long' })
                .toUpperCase();
              const isToday = item.day.toUpperCase() === today;

              return (
                <div
                  key={idx}
                  className={`${styles.dayRow} ${
                    isToday ? styles.todayRow : ''
                  }`}
                >
                  <span className={styles.dayName}>{item.short}</span>
                  <span className={styles.dayHours}>{item.hours}</span>
                </div>
              );
            })}
          </div>

          <button
            className={styles.expandLink}
            onClick={() => setExpanded(false)}
          >
            Collapse
          </button>
        </>
      )}
    </div>
  );
}
