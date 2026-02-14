/**
 * Tier 1 - Photo Collage
 * CRITICAL: Hero photo must be excluded
 * Collapses silently if no photos
 */

import { Photo } from '@/lib/types/merchant';

interface PhotoCollageProps {
  photos: Photo[];
  heroPhotoId: string; // Used to exclude hero from collage
}

export function PhotoCollage({ photos, heroPhotoId }: PhotoCollageProps) {
  // CRITICAL: Exclude hero photo from collage
  const collagePhotos = photos.filter(photo => photo.id !== heroPhotoId);

  // Guard: only render if we have non-hero photos
  if (collagePhotos.length === 0) {
    return null;
  }

  return (
    <div className="photo-collage">
      {collagePhotos.slice(0, 6).map((photo) => (
        <div key={photo.id} className="collage-photo">
          <img
            src={photo.url}
            alt={photo.alt || 'Place photo'}
            loading="lazy"
          />
        </div>
      ))}
      {collagePhotos.length > 6 && (
        <div className="collage-more">
          +{collagePhotos.length - 6} more
        </div>
      )}
    </div>
  );
}
