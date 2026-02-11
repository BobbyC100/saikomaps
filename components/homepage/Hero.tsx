import Link from 'next/link'
import styles from './Hero.module.css'

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.mapBg}></div>
      <div className={styles.heroOverlay}></div>
      <div className={styles.heroLockup}>
        <h1 className={styles.heroTitle}>Saiko Maps</h1>
        <div className={styles.heroLocation}>Los Angeles</div>
        <Link href="/explore" className={styles.heroCta}>
          Explore
        </Link>
      </div>
      <div className={styles.scrollHint}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M7 10l5 5 5-5"/>
        </svg>
      </div>
    </section>
  )
}
