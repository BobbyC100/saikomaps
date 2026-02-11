import Link from 'next/link'
import styles from './SectionHeader.module.css'

interface SectionHeaderProps {
  title?: string
  linkText: string
  linkHref: string
  /** When set, shows inline nav (By Neighborhood · By Cuisine · By Collection · By Experience) */
  activeView?: 'neighborhoods' | 'cuisine' | 'collections' | 'experience'
}

export function SectionHeader({ title, linkText, linkHref, activeView }: SectionHeaderProps) {
  if (activeView) {
    return (
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <nav className={styles.nav}>
            <Link
              href="/explore?view=neighborhoods"
              className={`${styles.navItem} ${activeView === 'neighborhoods' ? styles.active : ''}`}
            >
              By Neighborhood
            </Link>
            <span className={styles.navSep}>·</span>
            <Link
              href="/explore?view=cuisine"
              className={`${styles.navItem} ${activeView === 'cuisine' ? styles.active : ''}`}
            >
              By Cuisine
            </Link>
            <span className={styles.navSep}>·</span>
            <Link
              href="/explore?view=collections"
              className={`${styles.navItem} ${activeView === 'collections' ? styles.active : ''}`}
            >
              By Collection
            </Link>
            <span className={styles.navSep}>·</span>
            <Link
              href="/explore?view=experience"
              className={`${styles.navItem} ${activeView === 'experience' ? styles.active : ''}`}
            >
              By Experience
            </Link>
          </nav>
        </div>
        <Link href={linkHref} className={styles.link}>
          {linkText} →
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
      <Link href={linkHref} className={styles.link}>
        {linkText} →
      </Link>
    </div>
  )
}
