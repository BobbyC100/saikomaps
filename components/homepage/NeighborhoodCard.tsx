import Image from 'next/image'
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
      <div className={styles.image}>
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 25vw"
          className={styles.img}
        />
      </div>
      <div className={styles.overlay}></div>
      <div className={styles.content}>
        <h3 className={styles.name}>{name}</h3>
        <span className={styles.count}>{count} places</span>
      </div>
    </Link>
  )
}
