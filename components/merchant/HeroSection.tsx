'use client';

import { Camera, ArrowUpRight } from 'lucide-react';
import styles from './HeroSection.module.css';

interface HeroSectionProps {
  name: string;
  category: string | null;
  neighborhood: string | null;
  price: string | null;
  isOpen: boolean | null;
  statusText: string | null; // "Open · Closes 12 AM" or "Closed · Opens 11 AM"
  photoUrl: string | null;
  photoCount: number;
  onHeroClick: () => void;
  onShareClick: () => void;
  hours?: unknown; // Raw hours data for meal context calculation
}

export function HeroSection({
  name,
  category,
  neighborhood,
  price,
  isOpen,
  statusText,
  photoUrl,
  photoCount,
  onHeroClick,
  onShareClick,
  hours,
}: HeroSectionProps) {
  // Calculate meal context from hours
  const getMealContext = (): string | null => {
    if (!hours) return null;
    
    // Parse hours to get opening time
    const hoursObj = typeof hours === 'string' 
      ? (() => { try { return JSON.parse(hours); } catch { return null; } })()
      : hours as Record<string, unknown>;
    
    if (!hoursObj) return null;
    
    // Get today's hours
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    const todayKey = days[todayIndex];
    
    // Try weekday_text first (Google format)
    const weekdayText = (hoursObj.weekday_text ?? hoursObj.weekdayText) as string[] | undefined;
    let todayHours: string | null = null;
    
    if (weekdayText && weekdayText[todayIndex]) {
      todayHours = weekdayText[todayIndex] || null;
    } else if (todayKey && hoursObj[todayKey]) {
      todayHours = hoursObj[todayKey] as string;
    }
    
    if (!todayHours || todayHours.toLowerCase().includes('closed')) return null;
    
    // Extract opening time
    const timeMatch = todayHours.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i);
    if (!timeMatch) return null;
    
    const hour = parseInt(timeMatch[1] || '0');
    const period = (timeMatch[3] || '').toUpperCase();
    
    // Convert to 24-hour format
    let hour24 = hour;
    if (period === 'PM' && hour !== 12) hour24 = hour + 12;
    if (period === 'AM' && hour === 12) hour24 = 0;
    
    // Determine meal context
    if (hour24 >= 21) return 'Late Night'; // 9 PM or later
    if (hour24 >= 17) return 'Dinner'; // 5 PM or later
    if (hour24 < 12) return 'Lunch'; // Before noon
    
    return null; // Midday, no strong signal
  };
  
  const mealContext = getMealContext();
  
  // Build meta row with meal context instead of category
  const metaParts = [mealContext, neighborhood, price].filter(Boolean);
  const metaText = metaParts.join(' · ');

  return (
    <div className={styles.heroContainer}>
      {/* Hero Photo */}
      <div
        className={styles.heroPhoto}
        style={{
          backgroundImage: photoUrl
            ? `url(${photoUrl})`
            : 'linear-gradient(145deg, #E8E2D4, #D4CFC0)',
        }}
        onClick={onHeroClick}
      >
        {/* Hidden img for SEO crawlers — background-image is not indexable */}
        {photoUrl && (
          <img
            src={photoUrl}
            alt={`Photo of ${name}${neighborhood ? ` in ${neighborhood}` : ''}${category ? ` — ${category}` : ''}`}
            style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
          />
        )}
        {/* Photo Count Badge (bottom-left) */}
        {photoCount > 0 && (
          <button
            className={styles.photoCountBadge}
            onClick={(e) => {
              e.stopPropagation();
              onHeroClick();
            }}
          >
            <Camera className={styles.photoCountIcon} size={14} />
            <span className={styles.photoCountText}>{photoCount}</span>
          </button>
        )}

        {/* Share Button (top-right) */}
        <button
          className={styles.shareButton}
          onClick={(e) => {
            e.stopPropagation();
            onShareClick();
          }}
          aria-label="Share"
        >
          <ArrowUpRight className={styles.shareIcon} size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Hero Info */}
      <div className={styles.heroInfo}>
        {/* Name */}
        <h1 className={styles.placeName}>{name}</h1>

        {/* Meta Row */}
        {metaText && <div className={styles.metaRow}>{metaText}</div>}

        {/* Status */}
        {statusText && (
          <div className={styles.statusRow}>
            <span
              className={styles.statusDot}
              style={{
                background: isOpen ? '#4A7C59' : '#36454F',
                opacity: isOpen ? 1 : 0.5,
              }}
            />
            <span
              className={styles.statusText}
              style={{
                color: isOpen ? '#4A7C59' : '#36454F',
                opacity: isOpen ? 1 : 0.5,
              }}
            >
              {statusText}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
