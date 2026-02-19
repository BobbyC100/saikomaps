'use client';

import { IdentityCell } from './cells/IdentityCell';
import { ExperienceCell } from './cells/ExperienceCell';
import { StatusCell } from './cells/StatusCell';
import { OfferingsCell } from './cells/OfferingsCell';
import { EditorialCell } from './cells/EditorialCell';
import { UtilitiesCell } from './cells/UtilitiesCell';
import { parseHours } from '../lib/parseHours';
import styles from '../MerchantGrid.module.css';

interface EditorialSource {
  url: string;
  publication?: string;
  name?: string;
  excerpt?: string;
  content?: string;
}

export interface MerchantGridLocation {
  id: string;
  name: string;
  slug?: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  neighborhood: string | null;
  tagline?: string | null;
  description?: string | null;
  photoUrls?: string[] | null;
  vibeTags?: string[] | null;
  curatorNote?: string | null;
  pullQuote?: string | null;
  pullQuoteSource?: string | null;
  hours?: unknown;
  cuisineType?: string | null;
  tips?: string[] | null;
  priceLevel?: number | null;
  transitAccessible?: boolean | null;
  sources?: EditorialSource[] | null;
  thematicTags?: string[] | null;
  contextualConnection?: string | null;
  curatorAttribution?: string | null;
  instagram?: string | null;
  phone?: string | null;
}

interface MerchantGridProps {
  location: MerchantGridLocation;
  onOpenGallery?: (index: number) => void;
}

function Cell({
  className,
  isEmpty,
  children,
}: {
  className: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  if (isEmpty) return null;
  return (
    <div className={`${styles.cell} ${className}`}>
      {children}
    </div>
  );
}

export function MerchantGrid({ location, onOpenGallery }: MerchantGridProps) {
  const slug = location.slug ?? location.id;
  const { isOpen } = parseHours(location.hours);

  const hasExperience =
    (location.photoUrls?.length ?? 0) >= 1 ||
    (location.vibeTags?.length ?? 0) > 0 ||
    !!location.curatorNote?.trim() ||
    !!location.pullQuote?.trim();

  const hasStatus =
    !!location.address || !!location.hours;

  const hasOfferings =
    !!location.cuisineType?.trim() ||
    (location.tips?.length ?? 0) > 0;

  const hasEditorialContent =
    ((location.sources?.length ?? 0) > 0 && !!location.sources?.[0]?.url) ||
    !!location.curatorNote?.trim() ||
    (location.thematicTags?.length ?? 0) > 0 ||
    !!location.contextualConnection?.trim() ||
    !!location.curatorAttribution?.trim();

  return (
    <div className={styles.grid}>
      <Cell
        className={`${styles.cell1}`}
        isEmpty={true}
      >
        <IdentityCell
          name={location.name}
          category={location.category}
          tagline={location.tagline}
          description={location.description}
        />
      </Cell>

      <Cell
        className={`${styles.cell2} ${styles.cellExperience}`}
        isEmpty={!hasExperience}
      >
        <ExperienceCell
          photoUrls={location.photoUrls}
          vibeTags={location.vibeTags}
          curatorNote={location.curatorNote}
          pullQuote={location.pullQuote}
          pullQuoteSource={location.pullQuoteSource}
          onOpenGallery={onOpenGallery}
        />
      </Cell>

      <Cell
        className={`${styles.cell3} ${styles.cellStatus} ${
          isOpen === true ? styles.cellStatusOpen : isOpen === false ? styles.cellStatusClosed : ''
        }`}
        isEmpty={!hasStatus}
      >
        <StatusCell
          address={location.address}
          neighborhood={location.neighborhood}
          hours={location.hours}
          latitude={location.latitude}
          longitude={location.longitude}
          instagram={location.instagram}
          phone={location.phone}
          priceLevel={location.priceLevel}
          transitAccessible={location.transitAccessible}
        />
      </Cell>

      <Cell
        className={`${styles.cell4} ${styles.cellOfferings}`}
        isEmpty={!hasOfferings}
      >
        <OfferingsCell
          cuisineType={location.cuisineType}
          tips={location.tips}
        />
      </Cell>

      <Cell
        className={`${styles.cell5} ${styles.cellEditorial}`}
        isEmpty={!hasEditorialContent}
      >
        <EditorialCell
          sources={location.sources}
          curatorNote={location.curatorNote}
          thematicTags={location.thematicTags}
          contextualConnection={location.contextualConnection}
          curatorAttribution={location.curatorAttribution}
        />
      </Cell>

      <Cell
        className={styles.cell6}
        isEmpty={false}
      >
        <UtilitiesCell
          slug={slug}
          name={location.name}
          address={location.address}
          latitude={location.latitude}
          longitude={location.longitude}
        />
      </Cell>
    </div>
  );
}
