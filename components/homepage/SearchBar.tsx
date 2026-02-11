import Link from 'next/link'
import styles from './SearchBar.module.css'

export function SearchBar() {
  return (
    <section className={styles.searchBand}>
      <div className={styles.searchContainer}>
        <Link href="/explore" className={styles.searchLink}>
          <div className={styles.searchShell}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search: natural wine, cheese shops, coffee, tacos…"
              readOnly
            />
          </div>
        </Link>
      </div>
    </section>
  )
}
