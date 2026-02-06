'use client'

import Link from 'next/link'
import { GlobalHeader } from '@/components/layouts/GlobalHeader'
import { GlobalFooter } from '@/components/layouts/GlobalFooter'

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <GlobalHeader variant="default" />
      <main className="flex-1 max-w-6xl mx-auto px-8 pt-16 pb-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h1 className="text-5xl lg:text-6xl font-bold text-[#1A1A1A] leading-tight mb-6">
              Share places<br />
              <span style={{ color: '#E07A5F' }}>worth finding.</span>
            </h1>
            <p className="text-xl text-[#6B6B6B] mb-10 max-w-md">
              Create cool, personal maps in minutes. Pick a vibe, drop your spots, share the link.
            </p>
            <Link 
              href="/maps/new" 
              className="inline-block px-8 py-4 bg-[#E07A5F] text-white font-bold text-lg hover:bg-[#D06A4F] transition-colors"
              style={{ borderRadius: '2px' }}
            >
              Start a Map
            </Link>
          </div>
          <div className="relative hidden lg:block">
            <div className="relative w-full aspect-square flex items-center justify-center">
              {/* The Fold Logo - Large Version */}
              <svg width="240" height="200" viewBox="0 0 38 32" fill="none">
                <path d="M2 4 L13 2 L25 4 L36 2 L36 28 L25 30 L13 28 L2 30 Z" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="1.2"/>
                <line x1="13" y1="2" x2="13" y2="28" stroke="#E5E5E5" strokeWidth="0.8" strokeDasharray="2 2"/>
                <line x1="25" y1="4" x2="25" y2="30" stroke="#E5E5E5" strokeWidth="0.8" strokeDasharray="2 2"/>
                <path d="M25 8.5 C24 7.5 21 6 18 6.5 C14.5 7 13 9 13 11 C13 13.5 15.5 14.5 19 15.5 C22.5 16.5 25 17.5 25 20.5 C25 23 23 25.5 19 26 C15.5 26.5 13 25 12 24" stroke="#E07A5F" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
                <circle cx="25" cy="8.5" r="2.2" fill="#E07A5F"/>
                <circle cx="25" cy="8.5" r="0.9" fill="#FFFFFF"/>
                <circle cx="19" cy="16" r="1.6" fill="#E07A5F"/>
                <circle cx="19" cy="16" r="0.6" fill="#FFFFFF"/>
                <circle cx="12" cy="24" r="2.2" fill="#E07A5F"/>
                <circle cx="12" cy="24" r="0.9" fill="#FFFFFF"/>
              </svg>
            </div>
          </div>
        </div>
      </main>
      <GlobalFooter variant="standard" />
    </div>
  )
}
