import Link from 'next/link'
import { NeighborhoodCard } from '@/components/homepage/NeighborhoodCard'
import styles from './BrowseSection.module.css'

interface BrowseColumn {
  label: string
  href: string
  card: {
    name: string
    count: number
    imageUrl: string
    href: string
  }
}

interface BrowseSectionProps {
  columns: BrowseColumn[]
  seeAllHref: string
}

export function BrowseSection({ columns, seeAllHref }: BrowseSectionProps) {
  return (
    <section className={styles.browseSection}>
      <div className={styles.browseGrid}>
        {columns.map((col) => (
          <div key={col.label} className={styles.browseColumn}>
            <Link href={col.href} className={styles.columnHeader}>
              {col.label}
            </Link>
            <NeighborhoodCard {...col.card} />
          </div>
        ))}
        <div className={styles.seeAllWrapper}>
          <Link href={seeAllHref} className={styles.seeAll}>
            See all →
          </Link>
        </div>
      </div>
    </section>
  )
}
