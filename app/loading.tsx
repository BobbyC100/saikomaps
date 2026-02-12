/**
 * Loading skeleton for homepage (/)
 */

export default function HomeLoading() {
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

      {/* Hero section skeleton */}
      <div
        style={{
          padding: '80px 24px 64px',
          maxWidth: '720px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        {/* Headline */}
        <div
          style={{
            width: '80%',
            height: '48px',
            background: 'rgba(195, 176, 145, 0.2)',
            borderRadius: '6px',
            margin: '0 auto 20px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        {/* Subhead */}
        <div
          style={{
            width: '60%',
            height: '20px',
            background: 'rgba(195, 176, 145, 0.15)',
            borderRadius: '4px',
            margin: '0 auto 32px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <div
            style={{
              width: '140px',
              height: '44px',
              background: 'rgba(195, 176, 145, 0.25)',
              borderRadius: '8px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          <div
            style={{
              width: '140px',
              height: '44px',
              background: 'rgba(195, 176, 145, 0.15)',
              borderRadius: '8px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      {/* Featured maps section skeleton */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px' }}>
        {/* Section label */}
        <div
          style={{
            width: '120px',
            height: '12px',
            background: 'rgba(195, 176, 145, 0.2)',
            borderRadius: '4px',
            marginBottom: '16px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        {/* Map card grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                background: '#FFFDF7',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(195, 176, 145, 0.15)',
              }}
            >
              {/* 2x2 photo mosaic */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gridTemplateRows: '1fr 1fr',
                  gap: '2px',
                  height: '160px',
                }}
              >
                {[1, 2, 3, 4].map((j) => (
                  <div
                    key={j}
                    style={{
                      background: 'linear-gradient(145deg, #E8E2D4, #D4CFC0)',
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                  />
                ))}
              </div>
              {/* Card content */}
              <div style={{ padding: '14px 16px' }}>
                <div
                  style={{
                    width: '75%',
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
                    height: '10px',
                    background: 'rgba(195, 176, 145, 0.15)',
                    borderRadius: '4px',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
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
