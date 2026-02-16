import { Suspense } from 'react'
import SearchClient from './SearchClient'

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F5F0E1' }} />}>
      <SearchClient />
    </Suspense>
  )
}
