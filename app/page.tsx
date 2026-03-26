import { Hero } from '@/components/homepage/Hero'
import { SearchBar } from '@/components/homepage/SearchBar'
import { SectionHeader } from '@/components/homepage/SectionHeader'
import { NeighborhoodCard } from '@/components/homepage/NeighborhoodCard'
import { CategoryCard } from '@/components/homepage/CategoryCard'
import { CollectionCard } from '@/components/homepage/CollectionCard'
import { HomepageFooter } from '@/components/homepage/HomepageFooter'
import { getHomepageData } from '@/lib/homepage/queries'
import styles from './homepage.module.css'

export default async function Home() {
  const { neighborhoods, categories, collections } = await getHomepageData()

  return (
    <div className={styles.page}>
      <Hero />
      <SearchBar />

      <section className={styles.section}>
        <SectionHeader 
          title="BY NEIGHBORHOOD" 
          linkText="See all" 
          linkHref="/explore?scope=neighborhood" 
        />
        <div className={styles.neighborhoodGrid}>
          {neighborhoods.map((neighborhood) => (
            <NeighborhoodCard key={neighborhood.name} {...neighborhood} />
          ))}
        </div>
      </section>

      <section className={styles.categorySection}>
        <div className={styles.section}>
          <SectionHeader 
            title="BY CATEGORY" 
            linkText="See all" 
            linkHref="/explore?scope=city" 
          />
          <div className={styles.categoryGrid}>
            {categories.map((category) => (
              <CategoryCard key={category.title} {...category} />
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader 
          title="COLLECTIONS" 
          linkText="See all" 
          linkHref="/explore" 
        />
        <div className={styles.neighborhoodGrid}>
          {collections.map((collection) => (
            <CollectionCard key={collection.href} {...collection} />
          ))}
        </div>
      </section>

      <HomepageFooter />
    </div>
  )
}
