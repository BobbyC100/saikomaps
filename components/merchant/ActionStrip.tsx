'use client';

import { Navigation, Phone, Instagram } from 'lucide-react';
import styles from './ActionStrip.module.css';

interface ActionStripProps {
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  instagram: string | null;
}

export function ActionStrip({ latitude, longitude, phone, instagram }: ActionStripProps) {
  // Build directions URL
  const directionsUrl =
    latitude && longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
      : null;

  // Format phone for tel: protocol
  const phoneUrl = phone ? `tel:${phone.replace(/\D/g, '')}` : null;

  // Clean Instagram handle
  const instagramHandle = instagram?.replace(/^@/, '') || null;
  const instagramUrl = instagramHandle
    ? `https://instagram.com/${instagramHandle}`
    : null;

  return (
    <div className={styles.actionStrip}>
      {/* Directions */}
      {directionsUrl && (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.action}
        >
          <Navigation className={styles.icon} size={16} />
          <span className={styles.label}>Nav</span>
        </a>
      )}

      {/* Call */}
      {phoneUrl && (
        <a href={phoneUrl} className={styles.action}>
          <Phone className={styles.icon} size={16} />
          <span className={styles.label}>Call</span>
        </a>
      )}

      {/* Instagram */}
      {instagramUrl && (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.action}
        >
          <Instagram className={styles.icon} size={16} />
          <span className={styles.label}>Insta</span>
        </a>
      )}
    </div>
  );
}
