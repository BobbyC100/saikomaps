/**
 * Global Header Component — V1
 * 
 * Visibility Rules (LOCKED):
 * - Homepage/Search: Full search bar visible
 * - Map/Merchant: Search icon → expand inline
 * 
 * Search Interaction (V1):
 * - Form-based GET to /search?q=...
 * - No live suggestions
 * - Escape key closes expanded search
 * 
 * Branding: Always "Saiko Maps"
 * CTA: "Create" (not "Create Your Own")
 */

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Search, Share2, User } from 'lucide-react'
import { SaikoLogo } from '@/components/ui/SaikoLogo'
import { SearchInput } from '@/components/Search/SearchInput'
import { DEV_SHOW_ALL_UI } from '@/lib/config'

interface GlobalHeaderProps {
  variant?: 'default' | 'immersive'
  /** For map/merchant pages, enable share functionality */
  onShare?: () => void
}

export function GlobalHeader({ variant = 'default', onShare }: GlobalHeaderProps) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  
  // Gracefully handle session failures - don't block public pages
  const isSignedIn = status === 'authenticated' && !!session
  const showLoggedInNav = DEV_SHOW_ALL_UI || isSignedIn
  
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)

  // Determine if we're on a search page (to show full search bar)
  const isSearchPage = pathname?.startsWith('/search')
  const showFullSearch = variant === 'default' || isSearchPage

  // Immersive variant (map/merchant view) with expandable search
  if (variant === 'immersive' && !isSearchExpanded) {
    return (
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 24px',
          backgroundColor: 'var(--warm-white)',
          borderBottom: '1px solid rgba(54, 69, 79, 0.1)',
          height: '56px',
        }}
      >
        <SaikoLogo href={showLoggedInNav ? '/dashboard' : '/'} />
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setIsSearchExpanded(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              color: 'var(--charcoal)',
            }}
            aria-label="Open search"
          >
            <Search size={20} />
          </button>

          {onShare && (
            <button
              type="button"
              onClick={onShare}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                color: 'var(--charcoal)',
              }}
              aria-label="Share"
            >
              <Share2 size={20} />
            </button>
          )}
        </div>
      </header>
    )
  }

  // Expanded search state for immersive variant
  if (variant === 'immersive' && isSearchExpanded) {
    return (
      <header
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '14px 24px',
          backgroundColor: 'var(--warm-white)',
          borderBottom: '1px solid rgba(54, 69, 79, 0.1)',
          height: '56px',
          position: 'relative',
        }}
      >
        <SearchInput
          variant="expanded"
          onClose={() => setIsSearchExpanded(false)}
          style={{ maxWidth: '720px', width: '100%' }}
        />
        
        {/* Share icon remains accessible */}
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            style={{
              position: 'absolute',
              right: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              color: 'var(--charcoal)',
            }}
            aria-label="Share"
          >
            <Share2 size={20} />
          </button>
        )}
      </header>
    )
  }

  // Default variant - full navigation with search bar
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 24px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #F0F0F0',
        height: '56px',
        gap: '24px',
      }}
    >
      <SaikoLogo href={showLoggedInNav ? '/dashboard' : '/'} />

      {/* Desktop Search - Always visible on homepage/search */}
      {showFullSearch && (
        <div className="desktop-search" style={{ flex: 1, maxWidth: '480px' }}>
          <SearchInput variant="full" />
        </div>
      )}

      <nav
        style={{
          display: 'flex',
          gap: '24px',
          fontSize: '14px',
          alignItems: 'center',
          fontFamily: 'var(--font-dm-sans)',
        }}
      >
        {showLoggedInNav ? (
          <>
            <Link
              href="/maps/new"
              style={{
                color: 'var(--leather)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1'
              }}
              className="nav-link"
            >
              Create
            </Link>
            <Link
              href="/dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--charcoal)',
                opacity: 0.7,
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.7'
              }}
              className="nav-link"
              title="Dashboard"
            >
              <User size={18} />
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/login"
              style={{
                color: 'var(--charcoal)',
                opacity: 0.7,
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.7'
              }}
              className="nav-link"
            >
              Sign In
            </Link>
            <Link
              href="/maps/new"
              style={{
                color: 'var(--leather)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1'
              }}
              className="nav-link"
            >
              Create
            </Link>
          </>
        )}
      </nav>

      {/* Responsive CSS */}
      <style jsx>{`
        .desktop-search {
          display: none;
        }
        .nav-link {
          display: none;
        }

        @media (min-width: 768px) {
          .desktop-search {
            display: block;
          }
          .nav-link {
            display: flex;
          }
        }
      `}</style>
    </header>
  )
}
