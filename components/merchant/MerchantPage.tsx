/**
 * Merchant Page - Complete Assembly
 * CRITICAL: Tier order is locked and non-negotiable
 * See: merchant-page-implementation-checklist.md
 */

import { MerchantData } from '@/lib/types/merchant';
import { HeroHeader } from './HeroHeader';
import { PrimaryActionSet } from './PrimaryActionSet';
import { InstagramConfidenceRow } from './InstagramConfidenceRow';
import { PhotoCollage } from './PhotoCollage';
import { VibeTagsRow } from './VibeTagsRow';
import { TrustBlock } from './TrustBlock';
import { HoursCard } from './HoursCard';
import { AddressCard } from './AddressCard';
import { MapTile } from './MapTile';
import { AttributesCard } from './AttributesCard';
import { AlsoOnLists } from './AlsoOnLists';
import { HouseCard } from './HouseCard';

interface MerchantPageProps {
  merchant: MerchantData;
}

/**
 * LOCKED TIER ORDER (DO NOT REORDER):
 * 
 * 1. HeroHeader
 * 2. PrimaryActionSet
 * 3. InstagramConfidenceRow (conditional)
 * 4. PhotoCollage (conditional)
 * 5. VibeTagsRow (conditional)
 * 6. TrustBlock (conditional)
 * 7. HoursCard (ALWAYS)
 * 8. AddressCard (conditional)
 * 9. MapTile (conditional)
 * 10. AttributesCard (conditional)
 * 11. AlsoOnLists (conditional)
 * 12. HouseCard (conditional, Tier 5)
 */
export function MerchantPage({ merchant }: MerchantPageProps) {
  return (
    <main className="merchant-page">
      {/* Tier 0: Identity + Action */}
      <HeroHeader
        heroPhoto={merchant.heroPhoto}
        name={merchant.name}
        tagline={merchant.tagline}
      />

      <PrimaryActionSet
        phone={merchant.phone}
        reservationUrl={merchant.reservationUrl}
        coordinates={merchant.coordinates}
        merchantName={merchant.name}
      />

      {/* Tier 1.5: Instagram (slim treatment) */}
      {merchant.instagramHandle && (
        <InstagramConfidenceRow handle={merchant.instagramHandle} />
      )}

      {/* Tier 1: Visual Identity */}
      {merchant.photos && merchant.photos.length > 0 && (
        <PhotoCollage
          photos={merchant.photos}
          heroPhotoId={merchant.heroPhoto.id}
        />
      )}

      {merchant.vibeTags && merchant.vibeTags.length > 0 && (
        <VibeTagsRow tags={merchant.vibeTags} />
      )}

      {/* Tier 2: Editorial + Context */}
      <TrustBlock
        curatorNote={merchant.curatorNote}
        coverageSources={merchant.coverageSources}
      />

      {/* Tier 3: Facts - HOURS ALWAYS RENDERS */}
      <HoursCard
        hours={merchant.hours}
        openStatus={merchant.openStatus}
      />

      {merchant.address && (
        <AddressCard address={merchant.address} />
      )}

      {merchant.coordinates && (
        <MapTile
          coordinates={merchant.coordinates}
          merchantName={merchant.name}
        />
      )}

      {/* Tier 4: Attributes */}
      {merchant.attributes && merchant.attributes.length > 0 && (
        <AttributesCard attributes={merchant.attributes} />
      )}

      {/* Tier 5: Discovery */}
      {merchant.alsoOnLists && merchant.alsoOnLists.length > 0 && (
        <AlsoOnLists lists={merchant.alsoOnLists} />
      )}

      {merchant.house && (
        <HouseCard house={merchant.house} />
      )}
    </main>
  );
}
