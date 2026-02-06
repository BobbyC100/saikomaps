'use client';

export function SaikoStamp() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '32px 0',
      }}
    >
      {/* Left rule */}
      <div
        style={{
          width: 48,
          height: 1,
          background: '#C3B091',
          opacity: 0.2,
        }}
      />
      
      {/* Stamp text */}
      <div
        style={{
          fontFamily: "'Libre Baskerville', Georgia, serif",
          fontSize: 14,
          fontStyle: 'italic',
          color: 'rgba(195, 176, 145, 0.25)',
          textShadow: `
            0 1px 0 rgba(255, 255, 245, 0.7),
            0 -1px 0 rgba(120, 100, 68, 0.25)
          `,
          whiteSpace: 'nowrap',
        }}
      >
        Made by Saikos in Angeleno Heights
      </div>
      
      {/* Right rule */}
      <div
        style={{
          width: 48,
          height: 1,
          background: '#C3B091',
          opacity: 0.2,
        }}
      />
    </div>
  );
}
