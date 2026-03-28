import { Suspense } from 'react'
import ExploreClient from './ExploreClient'

export default function ExplorePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F5F0E1' }} />}>
      <ExploreClient />
    </Suspense>
  )
}
