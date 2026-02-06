'use client';

import { useMemo } from 'react';

export interface PlacePoint {
  id: string;
  name: string;
  x: number; // 0–1 relative to viewBox
  y: number;
  isFeatured?: boolean;
}

interface CoverMapProps {
  places: PlacePoint[];
  theme: 'light' | 'dark';
  onClick?: () => void;
}

/** Generate hydro network paths based on place cluster. Decorative, not geographically accurate. */
function generateHydroPaths(): { d: string; tier: 'trunk' | 'major' | 'minor' | 'capillary' | 'coastline' }[] {
  const paths: { d: string; tier: 'trunk' | 'major' | 'minor' | 'capillary' | 'coastline' }[] = [];

  // Main trunk - diagonal through the cluster
  paths.push({
    tier: 'trunk',
    d: 'M 80 0 Q 120 60 140 100 Q 160 150 130 200 Q 100 250 120 260',
  });

  // Coastline
  paths.push({
    tier: 'coastline',
    d: 'M 0 80 Q 100 70 200 85 Q 350 95 500 80 Q 650 90 820 75',
  });

  // Major branches (6–8)
  const majors = [
    'M 140 100 Q 180 90 220 110 Q 260 130 300 120',
    'M 140 100 Q 100 130 90 170 Q 85 210 100 250',
    'M 130 200 Q 200 190 280 210 Q 360 230 420 220',
    'M 130 200 Q 180 230 200 260',
    'M 120 260 Q 250 250 400 255 Q 550 260 700 250',
    'M 300 120 Q 380 100 480 115 Q 580 130 650 120',
    'M 420 220 Q 500 200 600 220 Q 700 240 780 230',
  ];
  majors.forEach((d) => paths.push({ tier: 'major', d }));

  // Minor branches (12–16)
  const minors = [
    'M 220 110 Q 240 95 270 105',
    'M 220 110 Q 200 125 210 150',
    'M 280 210 Q 310 195 340 205',
    'M 280 210 Q 260 230 270 255',
    'M 480 115 Q 510 100 540 110',
    'M 480 115 Q 460 135 470 160',
    'M 600 220 Q 630 205 660 215',
    'M 600 220 Q 580 240 590 260',
    'M 90 170 Q 60 185 70 210',
    'M 200 230 Q 230 215 250 235',
    'M 400 255 Q 430 240 450 260',
    'M 550 260 Q 580 245 610 255',
  ];
  minors.forEach((d) => paths.push({ tier: 'minor', d }));

  // Hair capillaries (20+)
  const capillaries = [
    'M 240 95 Q 255 88 265 98',
    'M 200 125 Q 195 140 205 155',
    'M 310 195 Q 325 188 335 198',
    'M 260 230 Q 275 223 285 233',
    'M 510 100 Q 525 93 535 103',
    'M 460 135 Q 455 150 465 165',
    'M 630 205 Q 645 198 655 208',
    'M 580 240 Q 595 233 605 243',
    'M 60 185 Q 45 195 55 210',
    'M 230 215 Q 215 225 225 240',
    'M 430 240 Q 415 250 425 265',
    'M 100 70 Q 115 63 125 73',
    'M 350 95 Q 365 88 375 98',
    'M 550 90 Q 565 83 575 93',
    'M 700 250 Q 715 243 725 253',
  ];
  capillaries.forEach((d) => paths.push({ tier: 'capillary', d }));

  return paths;
}

const TIER_STYLES = {
  light: {
    trunk: { stroke: '#5A8FA8', strokeWidth: 3, opacity: 0.22 },
    major: { stroke: '#6B96B0', strokeWidth: 1.5, opacity: 0.15 },
    minor: { stroke: '#6B96B0', strokeWidth: 0.75, opacity: 0.07 },
    capillary: { stroke: '#6B96B0', strokeWidth: 0.4, opacity: 0.04 },
    coastline: { stroke: '#4A7D96', strokeWidth: 3, opacity: 0.3 },
  },
  dark: {
    trunk: { stroke: '#89B4C4', strokeWidth: 3, opacity: 0.25 },
    major: { stroke: '#89B4C4', strokeWidth: 1.5, opacity: 0.16 },
    minor: { stroke: '#89B4C4', strokeWidth: 0.75, opacity: 0.07 },
    capillary: { stroke: '#89B4C4', strokeWidth: 0.4, opacity: 0.04 },
    coastline: { stroke: '#6A9BB5', strokeWidth: 3, opacity: 0.3 },
  },
} as const;

export function CoverMap({ places, theme, onClick }: CoverMapProps) {
  const paths = useMemo(() => generateHydroPaths(), []);
  const styles = TIER_STYLES[theme];

  const viewBox = '0 0 820 260';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className="group relative overflow-hidden cursor-pointer h-[200px] md:h-[260px]"
      style={{
        background:
          theme === 'light'
            ? 'linear-gradient(135deg, #EDE9DF 0%, #F0ECE2 50%, #E6E0D4 100%)'
            : 'linear-gradient(135deg, #172536 0%, #1E2F44 50%, #1B2A3D 100%)',
      }}
    >
      {/* Ocean wash */}
      <div
        className="absolute top-0 left-0 h-full pointer-events-none"
        style={{
          width: '14%',
          background:
            theme === 'light'
              ? 'linear-gradient(90deg, rgba(107,150,176,0.18) 0%, transparent 100%)'
              : 'linear-gradient(90deg, rgba(137,180,196,0.1) 0%, transparent 100%)',
        }}
      />

      {/* Hydro network SVG */}
      <svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        {paths.map((p, i) => {
          const s = styles[p.tier];
          return (
            <path
              key={`${p.tier}-${i}`}
              d={p.d}
              fill="none"
              stroke={s.stroke}
              strokeWidth={s.strokeWidth}
              opacity={s.opacity}
            />
          );
        })}
      </svg>

      {/* Pins */}
      {places.map((place) => (
        <div
          key={place.id}
          className="absolute"
          style={{
            left: `${place.x * 100}%`,
            top: `${place.y * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className="rounded-full"
            style={{
              width: place.isFeatured ? 14 : 10,
              height: place.isFeatured ? 14 : 10,
              backgroundColor: 'var(--fn-red)',
              border: `2px solid ${theme === 'light' ? 'var(--fn-parchment)' : 'var(--fn-navy)'}`,
              boxShadow: place.isFeatured
                ? '0 2px 6px rgba(214,69,65,0.3)'
                : '0 1px 3px rgba(0,0,0,0.15)',
            }}
          />
          {place.isFeatured && place.name && (
            <span
              className="absolute left-[17px] top-1/2 -translate-y-1/2 whitespace-nowrap italic"
              style={{
                fontFamily: "'Libre Baskerville', Georgia, serif",
                fontSize: '9px',
                color: theme === 'light' ? 'var(--fn-charcoal)' : 'var(--fn-parchment)',
                opacity: theme === 'light' ? 0.7 : 0.8,
              }}
            >
              {place.name}
            </span>
          )}
        </div>
      ))}

      {/* Scale bar */}
      <div
        className="absolute bottom-4 left-6 flex items-end gap-1"
        style={{ fontFamily: "'Courier New', monospace", fontSize: '7px' }}
      >
        <div
          className="relative w-11 h-0.5"
          style={{
            backgroundColor: theme === 'light' ? '#8B7355' : '#89B4C4',
            opacity: theme === 'light' ? 0.25 : 0.3,
          }}
        >
          <div
            className="absolute bottom-0 left-0 w-px h-1.5"
            style={{
              backgroundColor: theme === 'light' ? '#8B7355' : '#89B4C4',
              opacity: theme === 'light' ? 0.25 : 0.3,
            }}
          />
          <div
            className="absolute bottom-0 right-0 w-px h-1.5"
            style={{
              backgroundColor: theme === 'light' ? '#8B7355' : '#89B4C4',
              opacity: theme === 'light' ? 0.25 : 0.3,
            }}
          />
        </div>
        <span
          style={{
            color: theme === 'light' ? '#8B7355' : '#89B4C4',
            opacity: theme === 'light' ? 0.35 : 0.4,
            letterSpacing: '1px',
          }}
        >
          2 MI
        </span>
      </div>

      {/* Compass */}
      <div
        className="absolute bottom-4 right-4 opacity-[0.3]"
        style={{ width: 32, height: 32 }}
      >
        <svg viewBox="0 0 40 40" fill="none">
          <line
            x1="20"
            y1="6"
            x2="20"
            y2="34"
            stroke={theme === 'light' ? '#8B7355' : '#89B4C4'}
            strokeWidth="0.75"
            opacity="0.35"
          />
          <line
            x1="6"
            y1="20"
            x2="34"
            y2="20"
            stroke={theme === 'light' ? '#8B7355' : '#89B4C4'}
            strokeWidth="0.75"
            opacity="0.35"
          />
          <polygon
            points="20,6 21.5,14 18.5,14"
            fill={theme === 'light' ? '#8B7355' : '#89B4C4'}
            opacity="0.35"
          />
        </svg>
      </div>

      {/* Expand hint */}
      <div
        className="absolute top-3.5 right-4 px-2.5 py-1.5 rounded-md text-[9px] font-semibold uppercase tracking-wider opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: theme === 'light' ? 'rgba(54,69,79,0.6)' : 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          color: 'var(--fn-parchment)',
        }}
      >
        Expand Map
      </div>
    </div>
  );
}
