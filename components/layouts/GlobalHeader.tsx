/**
 * Global Header Component
 * Supports logged in, logged out, and immersive (map view) variants
 * Based on approved design spec
 */

'use client'

import React from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { SaikoLogo } from '@/components/ui/SaikoLogo'
import { DEV_SHOW_ALL_UI } from '@/lib/config'

interface GlobalHeaderProps {
  variant?: 'default' | 'immersive'
}

export function GlobalHeader({ variant = 'default' }: GlobalHeaderProps) {
  const { data: session, status } = useSession()
  const isSignedIn = status === 'authenticated' && !!session
  const showLoggedInNav = DEV_SHOW_ALL_UI || isSignedIn

  // Immersive variant (map/merchant view) - logo only
  if (variant === 'immersive') {
    return (
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 24px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #F0F0F0',
        }}
      >
        <SaikoLogo href={showLoggedInNav ? '/dashboard' : '/'} />
      </header>
    )
  }

  // Default variant - full navigation
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #F0F0F0',
      }}
    >
      <SaikoLogo href={showLoggedInNav ? '/dashboard' : '/'} />

      <nav
        style={{
          display: 'flex',
          gap: '24px',
          fontSize: '14px',
          alignItems: 'center',
        }}
      >
        {showLoggedInNav ? (
          <>
            <Link
              href="/maps/new"
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
            >
              Create New
            </Link>
            <Link
              href="/dashboard"
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
            >
              Dashboard
            </Link>
            <Link
              href="/account"
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
            >
              Account
            </Link>
            <button
              type="button"
              onClick={() => signOut()}
              style={{
                color: '#6B6B6B',
                background: 'none',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer',
                padding: 0,
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#1A1A1A'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#6B6B6B'
              }}
            >
              Sign Out
            </button>
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
            >
              Create Your Own
            </Link>
          </>
        )}
      </nav>
    </header>
  )
}
