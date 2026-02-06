'use client';

interface MapToggleProps {
  view: 'list' | 'map';
  onClick: () => void;
}

export function MapToggle({ view, onClick }: MapToggleProps) {
  const isMapView = view === 'map';

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-7 right-7 z-[90] flex items-center gap-2 rounded-[24px] px-5 py-3 text-[13px] font-semibold tracking-wide cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
      style={{
        backgroundColor: 'var(--fn-charcoal)',
        color: 'var(--fn-parchment)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 6px 28px rgba(0,0,0,0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
      }}
    >
      {isMapView ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          List
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Map
        </>
      )}
    </button>
  );
}
