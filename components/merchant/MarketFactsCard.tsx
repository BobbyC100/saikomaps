type Props = {
  schedule?: any | null;
  website?: string | null;
  instagram?: string | null;
  span?: number;
};

export default function MarketFactsCard({ 
  schedule, 
  website, 
  instagram,
  span = 2 
}: Props) {
  return (
    <section
      style={{
        gridColumn: `span ${span}`,
        background: 'white',
        border: '1px solid #E5E5E5',
        borderRadius: '8px',
        padding: '16px',
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600 }}>
        Market schedule
      </h3>

      {schedule ? (
        <pre style={{ 
          whiteSpace: 'pre-wrap', 
          fontSize: '12px',
          margin: '0 0 12px 0',
          fontFamily: 'monospace',
          overflow: 'auto',
        }}>
          {JSON.stringify(schedule, null, 2)}
        </pre>
      ) : (
        <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666' }}>
          Schedule not confirmed.
        </p>
      )}

      <div style={{ fontSize: '14px' }}>
        {website ? (
          <a 
            href={website} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#0066CC', textDecoration: 'none' }}
          >
            Website
          </a>
        ) : null}
        {instagram ? (
          <>
            {website ? <span style={{ margin: '0 6px', color: '#999' }}>·</span> : null}
            <a 
              href={`https://instagram.com/${instagram.replace('@', '')}`}
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#0066CC', textDecoration: 'none' }}
            >
              Instagram
            </a>
          </>
        ) : null}
      </div>
    </section>
  );
}
