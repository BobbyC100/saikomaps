'use client';

import { Train } from 'lucide-react';
import { HoursCard } from '@/components/merchant/HoursCard';
import { StatusIndicator } from '../StatusIndicator';
import { parseHours } from '../../lib/parseHours';

interface StatusCellProps {
  address: string | null;
  neighborhood?: string | null;
  hours?: unknown;
  latitude?: number | null;
  longitude?: number | null;
  instagram?: string | null;
  phone?: string | null;
  priceLevel?: number | null;
  transitAccessible?: boolean | null;
}

function formatPhone(phoneNumber: string): string {
  let cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    cleaned = cleaned.slice(1);
  }
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phoneNumber;
}

export function StatusCell({
  address,
  neighborhood,
  hours,
  latitude,
  longitude,
  instagram,
  phone,
  priceLevel,
  transitAccessible,
}: StatusCellProps) {
  const { today, isOpen, statusText, fullWeek, isIrregular } = parseHours(hours);
  const priceSymbol = priceLevel
    ? '$'.repeat(Math.min(priceLevel, 4))
    : null;

  return (
    <div data-source="status">
      {/* Price + Transit (Status cell) */}
      {(priceSymbol || transitAccessible === true) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mb-3">
          {priceSymbol && (
            <span className="text-[var(--charcoal)]">{priceSymbol}</span>
          )}
          {transitAccessible === true && (
            <span
              className="inline-flex items-center gap-1 text-[var(--charcoal)]/80"
              aria-label="Near public transit"
            >
              <Train size={14} strokeWidth={1.5} />
              Transit nearby
            </span>
          )}
        </div>
      )}

      {/* Status Indicator */}
      <StatusIndicator isOpen={isOpen} statusText={statusText} />

      {/* Hours Card */}
      <div className="mt-4">
        <HoursCard
          todayHours={today}
          isOpen={isOpen}
          statusText={statusText}
          fullWeek={fullWeek}
          isIrregular={isIrregular}
        />
      </div>

      {/* Address - no icon, left-aligned with hours */}
      {address && (
        <div className="mt-4 text-sm">
          <p className="text-[var(--charcoal)]">{address}</p>
          {neighborhood && (
            <p className="text-[var(--charcoal)]/60">{neighborhood}</p>
          )}
        </div>
      )}

      {/* Contact Links */}
      {(instagram || phone) && (
        <div className="mt-4 text-sm">
          {instagram && (
            <div className="mb-1">
              <a
                href={
                  instagram.startsWith('http')
                    ? instagram
                    : `https://instagram.com/${instagram.replace(/^@/, '')}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--charcoal)] hover:text-[var(--leather)] transition-colors"
              >
                • Instagram
              </a>
            </div>
          )}
          {phone && (
            <div>
              <a
                href={`tel:${phone.replace(/\D/g, '')}`}
                className="text-[var(--charcoal)] hover:text-[var(--leather)] transition-colors"
              >
                {formatPhone(phone)}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
