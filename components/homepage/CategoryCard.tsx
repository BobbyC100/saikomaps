import Link from 'next/link'
import styles from './CategoryCard.module.css'

interface CategoryCardProps {
  title: string
  description: string
  count: number
  imageUrl: string
  href: string
}

export function CategoryCard({ title, description, count, imageUrl, href }: CategoryCardProps) {
  return (
    <Link href={href} className={styles.card}>
      <div className={styles.image} style={{ backgroundImage: `url(${imageUrl})` }}></div>
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.desc}>{description}</p>
        <span className={styles.meta}>{count} places</span>
      </div>
    </Link>
  )
}
