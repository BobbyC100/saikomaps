'use client';

interface QuietCardTopoProps {
  neighborhood?: string | null;
  city?: string | null;
  theme?: 'light' | 'dark';
}

export function QuietCardTopo({ neighborhood, city, theme = 'light' }: QuietCardTopoProps) {
  const dark = theme === 'dark';

  // Build location label: "Silver Lake · Los Angeles"
  const locationLabel = [neighborhood, city].filter(Boolean).join(' · ');

  return (
    <div
      className="w-full rounded-xl overflow-hidden relative"
      style={{
        background: dark ? '#1B2A3D' : '#F5F0E1',
        minHeight: 160,
      }}
    >
      {/* Topographic contour lines */}
      <svg
        viewBox="0 0 320 160"
        className="absolute top-0 left-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Main contour lines - decreasing opacity for depth */}
        <path
          d="M 0 90 Q 40 70 80 85 Q 120 100 160 80 Q 200 60 240 75 Q 280 90 320 70"
          fill="none"
          stroke={dark ? '#89B4C4' : '#C3B091'}
          strokeWidth="1"
          opacity={dark ? 0.25 : 0.35}
        />
        <path
          d="M 0 100 Q 45 82 90 95 Q 135 108 180 90 Q 225 72 270 88 Q 310 100 320 85"
          fill="none"
          stroke={dark ? '#89B4C4' : '#C3B091'}
          strokeWidth="1"
          opacity={dark ? 0.2 : 0.28}
        />
        <path
          d="M 0 110 Q 50 95 100 108 Q 150 120 200 100 Q 250 82 300 98 Q 315 104 320 98"
          fill="none"
          stroke={dark ? '#89B4C4' : '#C3B091'}
          strokeWidth="1"
          opacity={dark ? 0.16 : 0.22}
        />
        <path
          d="M 0 75 Q 35 58 70 68 Q 110 80 150 65 Q 195 50 240 60 Q 280 70 320 55"
          fill="none"
          stroke={dark ? '#89B4C4' : '#C3B091'}
          strokeWidth="0.75"
          opacity={dark ? 0.14 : 0.18}
        />
        <path
          d="M 0 60 Q 30 48 65 55 Q 105 65 145 52 Q 190 40 235 50 Q 275 58 320 45"
          fill="none"
          stroke={dark ? '#89B4C4' : '#C3B091'}
          strokeWidth="0.75"
          opacity={dark ? 0.12 : 0.15}
        />
        <path
          d="M 0 120 Q 55 108 110 118 Q 165 130 220 112 Q 270 96 320 108"
          fill="none"
          stroke={dark ? '#89B4C4' : '#C3B091'}
          strokeWidth="0.75"
          opacity={dark ? 0.08 : 0.08}
        />
      </svg>

      {/* Location label - bottom left */}
      {locationLabel && (
        <span
          className="absolute bottom-3.5 left-4 z-10"
          style={{
            fontFamily: "'Libre Baskerville', Georgia, serif",
            fontSize: 9,
            fontStyle: 'italic',
            color: dark ? 'rgba(137,180,196,0.5)' : '#8B7355',
            opacity: dark ? 1 : 0.65,
          }}
        >
          {locationLabel}
        </span>
      )}
    </div>
  );
}
