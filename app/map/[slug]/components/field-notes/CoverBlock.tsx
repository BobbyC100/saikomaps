'use client';

import { CoverMapGoogle, type PlacePoint } from './CoverMapGoogle';

export interface CoverBlockProps {
  theme: 'light' | 'dark';
  category: string;
  title: string;
  description?: string | null;
  authorName: string;
  authorAvatar?: string | null;
  neighborhoods?: string[]; // Array of neighborhoods to display stacked
  vibeVitals?: string; // e.g. "Low-key, wine-forward"
  coverPins: PlacePoint[];
  onCoverMapClick?: () => void;
}

/** Format area vitals from neighborhoods. Max ~40 chars visible, middle dot separator. */
export function formatAreaVitals(neighborhoods: string[]): string {
  if (neighborhoods.length === 0) return '';
  if (neighborhoods.length === 1) return neighborhoods[0];
  if (neighborhoods.length === 2) return `${neighborhoods[0]} · ${neighborhoods[1]}`;
  if (neighborhoods.length === 3) return `${neighborhoods[0]} · ${neighborhoods[1]} · ${neighborhoods[2]}`;
  return `${neighborhoods[0]} · ${neighborhoods[1]} & ${neighborhoods.length - 2} more`;
}

export function CoverBlock({
  theme,
  category,
  title,
  description,
  authorName,
  authorAvatar,
  neighborhoods = [],
  vibeVitals,
  coverPins,
  onCoverMapClick,
}: CoverBlockProps) {
  const dark = theme === 'dark';
  const neighborhoodLabel = neighborhoods.length > 1 ? 'Neighborhoods' : 'Neighborhood';

  return (
    <div
      className="col-span-2 md:col-span-4 lg:col-span-6 rounded-2xl overflow-hidden animate-[fn-fadeUp_0.6s_ease-out_both]"
      style={{
        background: dark ? 'var(--fn-navy-surface)' : 'var(--fn-parchment)',
        border: dark ? '1px solid rgba(137,180,196,0.1)' : '1px solid rgba(195,176,145,0.25)',
      }}
    >
      <CoverMapGoogle places={coverPins} theme={theme} onClick={onCoverMapClick} />

      <div className="px-8 py-7">
        <div
          className="text-[10px] uppercase tracking-[0.2em] mb-3"
          style={{ color: dark ? 'rgba(137,180,196,0.6)' : 'var(--fn-khaki)' }}
        >
          {category}
        </div>
        <h1
          className="text-[32px] font-normal italic leading-tight mb-3.5"
          style={{
            fontFamily: "'Libre Baskerville', Georgia, serif",
            color: dark ? 'var(--fn-parchment)' : 'var(--fn-charcoal)',
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            className="text-sm leading-[1.7] mb-6 max-w-[480px]"
            style={{
              fontFamily: "'Libre Baskerville', Georgia, serif",
              color: dark ? 'var(--fn-parchment)' : 'var(--fn-charcoal)',
              opacity: 0.7,
            }}
          >
            {description}
          </p>
        )}
        <div
          className="flex items-center justify-between pt-5 border-t"
          style={{
            borderColor: dark ? 'rgba(137,180,196,0.1)' : 'rgba(195,176,145,0.25)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold overflow-hidden flex-shrink-0"
              style={{
                background: authorAvatar ? 'transparent' : 'var(--fn-charcoal)',
                color: 'var(--fn-parchment)',
              }}
            >
              {authorAvatar ? (
                <img
                  src={authorAvatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                authorName.charAt(0).toUpperCase()
              )}
            </div>
            <span
              className="text-[13px] font-semibold"
              style={{ color: dark ? 'var(--fn-parchment)' : 'var(--fn-charcoal)' }}
            >
              {authorName}
            </span>
          </div>
          <div className="flex gap-5">
            {neighborhoods.length > 0 && (
              <div className="text-right max-w-[400px]">
                <div
                  className="text-[8px] uppercase tracking-[0.15em] mb-1"
                  style={{ color: dark ? 'rgba(137,180,196,0.5)' : 'var(--fn-khaki)' }}
                >
                  {neighborhoodLabel}
                </div>
                <div
                  className="flex flex-wrap gap-0 justify-end"
                  style={{
                    fontFamily: "'Libre Baskerville', Georgia, serif",
                    fontSize: '12px',
                    lineHeight: '1.4',
                    color: dark ? 'var(--fn-parchment)' : 'var(--fn-charcoal)',
                  }}
                >
                  {neighborhoods.map((neighborhood, index) => (
                    <span key={index} style={{ whiteSpace: 'nowrap' }}>
                      {neighborhood}
                      {index < neighborhoods.length - 1 && (
                        <span style={{ 
                          color: dark ? 'rgba(137,180,196,0.3)' : '#C3B091',
                          margin: '0 4px'
                        }}>
                          ·
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {vibeVitals && (
              <div className="text-right">
                <div
                  className="text-[8px] uppercase tracking-[0.15em] mb-0.5"
                  style={{ color: dark ? 'rgba(137,180,196,0.5)' : 'var(--fn-khaki)' }}
                >
                  Vibe
                </div>
                <span
                  className="text-xs"
                  style={{
                    fontFamily: "'Libre Baskerville', Georgia, serif",
                    color: dark ? 'var(--fn-parchment)' : 'var(--fn-charcoal)',
                  }}
                >
                  {vibeVitals}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
