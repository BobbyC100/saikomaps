/**
 * Loading skeleton for /map/[slug]
 */

export default function MapLoading() {
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

      {/* Split layout skeleton */}
      <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
        {/* Left: cards */}
        <div style={{ flex: '1 1 58%', padding: '24px', overflow: 'hidden' }}>
          {/* Title block */}
          <div
            style={{
              width: '70%',
              height: '32px',
              background: 'rgba(0,0,0,0.06)',
              borderRadius: '4px',
              marginBottom: '8px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          <div
            style={{
              width: '50%',
              height: '16px',
              background: 'rgba(0,0,0,0.04)',
              borderRadius: '4px',
              marginBottom: '24px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />

          {/* Location card skeletons */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid #E5E5E5',
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '16px',
              }}
            >
              {/* Image */}
              <div
                style={{
                  width: '100%',
                  height: '160px',
                  background: 'linear-gradient(145deg, #E8E2D4, #D4CFC0)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              {/* Content */}
              <div style={{ padding: '16px' }}>
                <div
                  style={{
                    width: '60%',
                    height: '20px',
                    background: 'rgba(0,0,0,0.06)',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
                <div
                  style={{
                    width: '40%',
                    height: '14px',
                    background: 'rgba(0,0,0,0.04)',
                    borderRadius: '4px',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Right: map placeholder (hidden on mobile) */}
        <div
          style={{
            flex: '0 0 42%',
            background: 'rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          className="hidden md:flex"
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '3px solid rgba(0,0,0,0.08)',
              borderTopColor: '#C3B091',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
