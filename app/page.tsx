import { Hero } from '@/components/homepage/Hero'
import { SearchBar } from '@/components/homepage/SearchBar'
import { BrowseSection } from '@/components/homepage/BrowseSection'
import { SectionHeader } from '@/components/homepage/SectionHeader'
import { NeighborhoodCard } from '@/components/homepage/NeighborhoodCard'
import { CategoryCard } from '@/components/homepage/CategoryCard'
import { HomepageFooter } from '@/components/homepage/HomepageFooter'
import styles from './homepage.module.css'


    },
    {
      label: 'Cuisine',
      href: '/explore?view=cuisine',
      card: {
        name: 'Korean',
        count: 24,
        imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=450&fit=crop',
        href: '/explore?cuisine=korean'
      }
    },
    {
      label: 'Collection',
      href: '/explore?view=collections',
      card: {
        name: 'Date Night',
        count: 24,
        imageUrl: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&h=450&fit=crop',
        href: '/explore?experience=date-night'
      }
    },
    {
      label: 'Experience',
      href: '/explore?view=experience',
      card: {
        name: 'Late Night',
        count: 22,
        imageUrl: 'https://images.unsplash.com/photo-1504718855392-c0f33b372e72?w=600&h=450&fit=crop',
        href: '/explore?experience=late-night'
      }
    }
  ]

  const neighborhoods = [
    {
      name: 'Echo Park',
      count: 31,
      imageUrl: 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=600&h=450&fit=crop',
      href: '/explore?neighborhood=echo-park'
    },
    {
      name: 'Highland Park',
      count: 28,
      imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&h=450&fit=crop',
      href: '/explore?neighborhood=highland-park'
    },
    {
      name: 'Koreatown',
      count: 67,
      imageUrl: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=600&h=450&fit=crop',
      href: '/explore?neighborhood=koreatown'
    },
    {
      name: 'San Gabriel Valley',
      count: 53,
      imageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&h=450&fit=crop',
      href: '/explore?neighborhood=san-gabriel-valley'
    }
  ]

  const categories = [
    {
      title: 'Wine',
      description: 'Natural pours and neighborhood gems',
      count: 19,
      imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=375&fit=crop',
      href: '/explore?category=wine'
    },
    {
      title: 'Coffee',
      description: 'Third wave pours and quiet corners',
      count: 38,
      imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=375&fit=crop',
      href: '/explore?category=coffee'
    },
    {
      title: 'Cheese Shops',
      description: 'Curated selections and expert picks',
      count: 8,
      imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=600&h=375&fit=crop',
      href: '/explore?category=cheese-shops'
    },
    {
      title: 'Late Night',
      description: 'Open past midnight when you need it',
      count: 24,
      imageUrl: 'https://images.unsplash.com/photo-1504718855392-c0f33b372e72?w=600&h=375&fit=crop',
      href: '/explore?category=late-night'
    }
  ]

  const experiences = [
    { name: 'Date Night', count: 24, imageUrl: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&h=450&fit=crop', href: '/explore?experience=date-night' },
    { name: 'Solo Dinner', count: 18, imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=450&fit=crop', href: '/explore?experience=solo-dinner' },
    { name: 'Group Night', count: 31, imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&h=450&fit=crop', href: '/explore?experience=group-night' },
    { name: 'Late Night', count: 22, imageUrl: 'https://images.unsplash.com/photo-1504718855392-c0f33b372e72?w=600&h=450&fit=crop', href: '/explore?experience=late-night' },
    { name: 'Patio', count: 28, imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=450&fit=crop', href: '/explore?experience=patio' },
    { name: 'Celebration', count: 19, imageUrl: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&h=450&fit=crop', href: '/explore?experience=celebration' }
  ]

  return (
    <div className={styles.page}>
      <Hero />
      <SearchBar />



      <section className={styles.categorySection}>
        <div className={styles.section}>
          <SectionHeader
            title="BY CATEGORY"
            linkText="See all"
            linkHref="/explore?filter=categories"
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
          title="BY EXPERIENCE"
          linkText="See all"
          linkHref="/explore?view=experience"
        />
        <div className={styles.neighborhoodGrid}>
          {experiences.map((experience) => (
            <NeighborhoodCard key={experience.name} {...experience} />
          ))}
        </div>
      </section>

      <HomepageFooter />
    </div>
  )
}
