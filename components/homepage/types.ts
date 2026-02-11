// Homepage Component Type Definitions
// Quick reference for using homepage components

import { ReactNode } from 'react'

// ======================
// Hero Component
// ======================
// No props - all content is hardcoded
// To customize, edit: components/homepage/Hero.tsx

export function Hero(): JSX.Element

// ======================
// Section Header
// ======================
export interface SectionHeaderProps {
  title: string        // Uppercase title (e.g., "BY NEIGHBORHOOD")
  linkText: string     // Link text (e.g., "See all")
  linkHref: string     // URL to link to
}

export function SectionHeader(props: SectionHeaderProps): JSX.Element

// Example:
// <SectionHeader 
//   title="BY NEIGHBORHOOD" 
//   linkText="See all" 
//   linkHref="/explore?filter=neighborhoods" 
// />

// ======================
// Neighborhood Card
// ======================
export interface NeighborhoodCardProps {
  name: string         // Neighborhood name (e.g., "Echo Park")
  count: number        // Number of places (e.g., 31)
  imageUrl: string     // URL to background image
  href: string         // Link destination
}

export function NeighborhoodCard(props: NeighborhoodCardProps): JSX.Element

// Example:
// <NeighborhoodCard
//   name="Echo Park"
//   count={31}
//   imageUrl="https://images.unsplash.com/photo-..."
//   href="/explore?neighborhood=echo-park"
// />

// ======================
// Category Card
// ======================
export interface CategoryCardProps {
  title: string        // Category title (e.g., "Wine")
  description: string  // Brief description (e.g., "Natural pours and neighborhood gems")
  count: number        // Number of places
  imageUrl: string     // URL to card image
  href: string         // Link destination
}

export function CategoryCard(props: CategoryCardProps): JSX.Element

// Example:
// <CategoryCard
//   title="Wine"
//   description="Natural pours and neighborhood gems"
//   count={19}
//   imageUrl="https://images.unsplash.com/photo-..."
//   href="/explore?category=wine"
// />

// ======================
// Homepage Footer
// ======================
// No props - all content is hardcoded
// To customize, edit: components/homepage/HomepageFooter.tsx

export function HomepageFooter(): JSX.Element

// ======================
// Usage Example
// ======================
/*
import { 
  Hero, 
  SectionHeader, 
  NeighborhoodCard, 
  CategoryCard, 
  HomepageFooter 
} from '@/components/homepage'

export default function Home() {
  return (
    <div>
      <Hero />
      
      <section>
        <SectionHeader 
          title="BY NEIGHBORHOOD" 
          linkText="See all" 
          linkHref="/explore" 
        />
        <div className="grid">
          <NeighborhoodCard
            name="Echo Park"
            count={31}
            imageUrl="https://..."
            href="/explore?neighborhood=echo-park"
          />
        </div>
      </section>
      
      <section>
        <SectionHeader 
          title="BY CATEGORY" 
          linkText="See all" 
          linkHref="/explore" 
        />
        <div className="grid">
          <CategoryCard
            title="Wine"
            description="Natural pours and neighborhood gems"
            count={19}
            imageUrl="https://..."
            href="/explore?category=wine"
          />
        </div>
      </section>
      
      <HomepageFooter />
    </div>
  )
}
*/

// ======================
// Dynamic Data Example
// ======================
/*
// Fetch from database
const neighborhoods = await getNeighborhoods()
const categories = await getCategories()

// Map to component props
{neighborhoods.map(n => (
  <NeighborhoodCard
    key={n.id}
    name={n.name}
    count={n.placeCount}
    imageUrl={n.imageUrl}
    href={`/explore?neighborhood=${n.slug}`}
  />
))}
*/
