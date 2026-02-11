'use client'

import React from 'react'

interface SectionHeaderProps {
  title: string
  linkText?: string
  linkHref?: string
  rightElement?: React.ReactNode
}

export function SectionHeader({ title, linkText, linkHref, rightElement }: SectionHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: '16px',
        paddingTop: '8px',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-libre)',
          fontSize: '14px',
          fontStyle: 'italic',
          color: '#36454F',
          margin: 0,
        }}
      >
        {title}
      </h2>
      {rightElement || (linkText && linkHref && (
        <a
          href={linkHref}
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: '#C3B091',
            textDecoration: 'none',
            fontFamily: 'var(--font-dm-sans)',
          }}
        >
          {linkText} →
        </a>
      ))}
    </div>
  )
}
