import React from 'react'
import { RecentSearch } from '@/lib/hooks/useRecentSearches'
import { X } from 'lucide-react'

interface RecentSearchesProps {
  searches: RecentSearch[]
  onSelect: (query: string) => void
  onRemove: (query: string) => void
}

export function RecentSearches({ searches, onSelect, onRemove }: RecentSearchesProps) {
  if (searches.length === 0) {
    return null
  }

  return (
    <>
      <div
        style={{
          padding: '12px 16px 6px',
          fontSize: '9px',
          fontWeight: 600,
          color: '#C3B091',
          letterSpacing: '2px',
          textTransform: 'uppercase',
        }}
      >
        RECENT
      </div>
      {searches.map((search) => (
        <div
          key={search.query}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(195, 176, 145, 0.12)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
          onClick={() => onSelect(search.query)}
        >
          <span
            style={{
              fontFamily: 'var(--font-libre)',
              fontSize: '14px',
              color: '#36454F',
            }}
          >
            {search.query}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(search.query)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#C3B091',
              opacity: 0.6,
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.6'
            }}
            aria-label={`Remove ${search.query} from recent searches`}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </>
  )
}
