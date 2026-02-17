'use client';

import styles from './MenuCard.module.css';

interface MenuItem {
  name: string;
  price?: string;
  description?: string;
}

interface MenuCardProps {
  items: MenuItem[];
  span?: number; // Grid column span (3 or 6)
}

export function MenuCard({ items, span = 3 }: MenuCardProps) {
  if (!items || items.length === 0) return null;

  // Show first 6 items
  const displayItems = items.slice(0, 6);

  return (
    <div 
      className={styles.menuCard}
      style={{ gridColumn: `span ${span}` }}
    >
      <div className={styles.label}>MENU HIGHLIGHTS</div>
      <div className={styles.menuList}>
        {displayItems.map((item, idx) => (
          <div key={idx} className={styles.menuItem}>
            <div className={styles.itemRow}>
              <span className={styles.itemName}>{item.name}</span>
              {item.price && (
                <span className={styles.itemPrice}>{item.price}</span>
              )}
            </div>
            {item.description && (
              <div className={styles.itemDescription}>{item.description}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
