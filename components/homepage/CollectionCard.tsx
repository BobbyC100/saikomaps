import Image from 'next/image'
import Link from 'next/link'
import styles from './CollectionCard.module.css'

interface CollectionCardProps {
  title: string
  description: string
  count: number
  imageUrl: string
  href: string
}

export function CollectionCard({ title, description, count, imageUrl, href }: CollectionCardProps) {
  return (
    <Link href={href} className={styles.card}>
      <div className={styles.image}>
        <Image
          src={imageUrl}
          alt={title}
          fill
          sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 25vw"
          className={styles.img}
        />
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.desc}>{description}</p>
        <span className={styles.meta}>{count} places</span>
      </div>
    </Link>
  )
}
