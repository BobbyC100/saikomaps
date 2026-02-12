/**
 * Loading skeleton for /place/[slug]
 */

export default function PlaceLoading() {
  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      {/* Header skeleton */}
      <div
        style={{
          height: '56px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
        }}
      >
        <div
          style={{
            width: '100px',
            height: '20px',
            background: 'rgba(0,0,0,0.06)',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Hero image skeleton */}
      <div
        style={{
          width: '100%',
          height: '220px',
          background: 'linear-gradient(145deg, #E8E2D4, #D4CFC0)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />

      {/* Content skeleton */}
      <div style={{ padding: '16px 20px', maxWidth: '600px' }}>
        {/* Name */}
        <div
          style={{
            width: '60%',
            height: '28px',
            background: 'rgba(0,0,0,0.06)',
            borderRadius: '4px',
            marginBottom: '10px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        {/* Meta row */}
        <div
          style={{
            width: '40%',
            height: '14px',
            background: 'rgba(0,0,0,0.04)',
            borderRadius: '4px',
            marginBottom: '8px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        {/* Status */}
        <div
          style={{
            width: '30%',
            height: '12px',
            background: 'rgba(0,0,0,0.04)',
            borderRadius: '4px',
            marginBottom: '24px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />

        {/* Action buttons skeleton */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: '80px',
                height: '36px',
                background: 'rgba(0,0,0,0.04)',
                borderRadius: '8px',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>

        {/* Cards skeleton */}
        {[1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '100%',
              height: '120px',
              background: 'rgba(0,0,0,0.03)',
              borderRadius: '12px',
              marginBottom: '12px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
