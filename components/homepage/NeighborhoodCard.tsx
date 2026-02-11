import Link from 'next/link'
import styles from './NeighborhoodCard.module.css'

interface NeighborhoodCardProps {
  name: string
  count: number
  imageUrl: string
  href: string
}

export function NeighborhoodCard({ name, count, imageUrl, href }: NeighborhoodCardProps) {
  return (
    <Link href={href} className={styles.card}>
      <div className={styles.image} style={{ backgroundImage: `url(${imageUrl})` }}></div>
      <div className={styles.overlay}></div>
      <div className={styles.content}>
        <h3 className={styles.name}>{name}</h3>
        <span className={styles.count}>{count} places</span>
      </div>
    </Link>
  )
}
