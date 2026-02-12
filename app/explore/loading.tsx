/**
 * Loading skeleton for /explore
 */

export default function ExploreLoading() {
  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E1' }}>
      {/* Header skeleton */}
      <div
        style={{
          height: '56px',
          borderBottom: '1px solid rgba(195, 176, 145, 0.15)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
        }}
      >
        <div
          style={{
            width: '100px',
            height: '20px',
            background: 'rgba(195, 176, 145, 0.2)',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Search bar skeleton */}
      <div style={{ maxWidth: '600px', margin: '32px auto 24px', padding: '0 20px' }}>
        <div
          style={{
            width: '100%',
            height: '44px',
            background: '#FFFDF7',
            borderRadius: '8px',
            border: '1px solid rgba(195, 176, 145, 0.2)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Grid skeleton */}
      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '16px',
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              background: '#FFFDF7',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid rgba(195, 176, 145, 0.15)',
            }}
          >
            {/* Image */}
            <div
              style={{
                width: '100%',
                aspectRatio: '16 / 10',
                background: 'linear-gradient(145deg, #E8E2D4, #D4CFC0)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            {/* Content */}
            <div style={{ padding: '14px 16px' }}>
              <div
                style={{
                  width: '70%',
                  height: '16px',
                  background: 'rgba(195, 176, 145, 0.2)',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              <div
                style={{
                  width: '40%',
                  height: '12px',
                  background: 'rgba(195, 176, 145, 0.15)',
                  borderRadius: '4px',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            </div>
          </div>
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
