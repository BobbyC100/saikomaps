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

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Search, Share2, User, Menu, X } from 'lucide-react'
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
  const isSignedIn = status === 'authenticated' && !!session
  const showLoggedInNav = DEV_SHOW_ALL_UI || isSignedIn
  
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Close mobile menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }
    if (isMobileMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isMobileMenuOpen])

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
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #F0F0F0',
          height: '56px',
        }}
      >
        <SaikoLogo href={showLoggedInNav ? '/profile' : '/'} />
        
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
              padding: '12px',
              color: '#C3B091',
              minWidth: '44px',
              minHeight: '44px',
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
                padding: '12px',
                color: '#C3B091',
                minWidth: '44px',
                minHeight: '44px',
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
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #F0F0F0',
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
              padding: '12px',
              color: '#C3B091',
              minWidth: '44px',
              minHeight: '44px',
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
    <div ref={mobileMenuRef} style={{ position: 'relative' }}>
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

        {/* Desktop nav links */}
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
                  color: '#E07A5F',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#D06A4F'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#E07A5F'
                }}
                className="nav-link"
              >
                Create
              </Link>
              <Link
                href="/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6B6B6B',
                  textDecoration: 'none',
                  minWidth: '44px',
                  minHeight: '44px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#1A1A1A'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#6B6B6B'
                }}
                className="nav-link"
                title="My Maps"
              >
                <User size={18} />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                style={{
                  color: '#6B6B6B',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#1A1A1A'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#6B6B6B'
                }}
                className="nav-link"
              >
                Sign In
              </Link>
              <Link
                href="/maps/new"
                style={{
                  color: '#E07A5F',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#D06A4F'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#E07A5F'
                }}
                className="nav-link"
              >
                Create
              </Link>
            </>
          )}
        </nav>

        {/* Mobile hamburger button */}
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={(e) => {
            e.stopPropagation()
            setIsMobileMenuOpen((o) => !o)
          }}
          style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '12px',
            color: '#6B6B6B',
            minWidth: '44px',
            minHeight: '44px',
          }}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile dropdown menu */}
      {isMobileMenuOpen && (
        <div
          className="mobile-menu-dropdown"
          style={{
            position: 'absolute',
            top: '56px',
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #F0F0F0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            zIndex: 50,
            padding: '8px 0',
            fontFamily: 'var(--font-dm-sans)',
          }}
        >
          {showLoggedInNav ? (
            <>
              <Link
                href="/maps/new"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 24px',
                  color: '#E07A5F',
                  fontWeight: 500,
                  fontSize: '15px',
                  textDecoration: 'none',
                }}
              >
                Create
              </Link>
              <Link
                href="/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 24px',
                  color: '#6B6B6B',
                  fontSize: '15px',
                  textDecoration: 'none',
                }}
              >
                <User size={18} />
                My Maps
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 24px',
                  color: '#6B6B6B',
                  fontSize: '15px',
                  textDecoration: 'none',
                }}
              >
                Sign In
              </Link>
              <Link
                href="/maps/new"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 24px',
                  color: '#E07A5F',
                  fontWeight: 500,
                  fontSize: '15px',
                  textDecoration: 'none',
                }}
              >
                Create
              </Link>
            </>
          )}
        </div>
      )}

      {/* Responsive CSS */}
      <style jsx>{`
        .desktop-search {
          display: none;
        }
        .nav-link {
          display: none;
        }
        .mobile-menu-btn {
          display: flex !important;
        }

        @media (min-width: 768px) {
          .desktop-search {
            display: block;
          }
          .nav-link {
            display: flex;
          }
          .mobile-menu-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
