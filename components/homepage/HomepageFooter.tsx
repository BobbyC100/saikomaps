import Link from 'next/link'
import styles from './HomepageFooter.module.css'

export function HomepageFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div>
          <div className={styles.logo}>SAIKO</div>
          <p className={styles.tagline}>Curated maps from people who know.</p>
        </div>
        <div className={styles.links}>
          <div className={styles.linkGroup}>
            <h4>Explore</h4>
            <Link href="/explore">All Maps</Link>
            <Link href="/explore?filter=neighborhoods">Neighborhoods</Link>
            <Link href="/explore?filter=categories">Categories</Link>
          </div>
          <div className={styles.linkGroup}>
            <h4>Saiko</h4>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>© 2026 Saiko Maps</div>
    </footer>
  )
}
