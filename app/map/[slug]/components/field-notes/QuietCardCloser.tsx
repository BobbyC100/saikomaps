'use client';

interface QuietCardCloserProps {
  theme?: 'light' | 'dark';
}

export function QuietCardCloser({ theme = 'light' }: QuietCardCloserProps) {
  const dark = theme === 'dark';

  return (
    <div
      className="w-full rounded-xl overflow-hidden relative flex items-center justify-center gap-5"
      style={{
        background: dark ? '#1B2A3D' : '#F5F0E1',
        height: 100,
      }}
    >
      {/* Top gradient rule */}
      <div
        className="absolute left-6 right-6 top-0 h-px"
        style={{
          background: dark
            ? 'linear-gradient(90deg, transparent 0%, rgba(137,180,196,0.3) 50%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, #8B7355 50%, transparent 100%)',
          opacity: dark ? 1 : 0.3,
        }}
      />

      {/* Left rule */}
      <div
        style={{
          width: 40,
          height: 1,
          background: dark ? 'rgba(137,180,196,0.4)' : '#8B7355',
          opacity: dark ? 1 : 0.45,
        }}
      />

      {/* Text */}
      <span
        style={{
          fontFamily: "'Libre Baskerville', Georgia, serif",
          fontSize: 11,
          fontStyle: 'italic',
          color: dark ? 'rgba(137,180,196,0.55)' : '#8B7355',
          opacity: dark ? 1 : 0.65,
          letterSpacing: '0.5px',
        }}
      >
        Made with Saiko Maps
      </span>

      {/* Right rule */}
      <div
        style={{
          width: 40,
          height: 1,
          background: dark ? 'rgba(137,180,196,0.4)' : '#8B7355',
          opacity: dark ? 1 : 0.45,
        }}
      />

      {/* Bottom gradient rule */}
      <div
        className="absolute left-6 right-6 bottom-0 h-px"
        style={{
          background: dark
            ? 'linear-gradient(90deg, transparent 0%, rgba(137,180,196,0.3) 50%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, #8B7355 50%, transparent 100%)',
          opacity: dark ? 1 : 0.3,
        }}
      />
    </div>
  );
}
