'use client';

import { useState } from 'react';
import { GalleryCard } from '@/components/merchant/GalleryCard';
import { GalleryLightbox } from '@/components/merchant/GalleryLightbox';
import { SceneSenseCard } from '@/components/merchant/SceneSenseCard';

interface SceneSenseOutput {
  atmosphere: string[];
  energy: string[];
  scene: string[];
}

interface ExperienceCellProps {
  photoUrls?: string[] | null;
  scenesense?: SceneSenseOutput | null;
  curatorNote?: string | null;
  pullQuote?: string | null;
  pullQuoteSource?: string | null;
  onOpenGallery?: (index: number) => void;
}

const CURATOR_MAX = 250;

export function ExperienceCell({
  photoUrls,
  scenesense,
  curatorNote,
  pullQuote,
  pullQuoteSource,
  onOpenGallery,
}: ExperienceCellProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [curatorExpanded, setCuratorExpanded] = useState(false);

  const handleThumbnailClick = onOpenGallery ?? ((idx: number) => {
    setLightboxIndex(idx);
    setLightboxOpen(true);
  });

  const galleryPhotos = (photoUrls?.length ?? 0) > 0 ? photoUrls! : [];
  const hasSceneSense = scenesense != null && (
    scenesense.atmosphere.length > 0 ||
    scenesense.energy.length > 0 ||
    scenesense.scene.length > 0
  );
  const hasCurator = !!curatorNote?.trim();
  const hasPullQuote = !!pullQuote?.trim();

  if (!galleryPhotos.length && !hasSceneSense && !hasCurator && !hasPullQuote) {
    return null;
  }

  const curatorText = curatorNote?.trim() ?? '';
  const showCuratorReadMore = curatorText.length > CURATOR_MAX;
  const curatorDisplay = curatorExpanded
    ? curatorText
    : showCuratorReadMore
      ? curatorText.slice(0, CURATOR_MAX) + '...'
      : curatorText;

  return (
    <div className="space-y-4">
      {galleryPhotos.length > 0 && (
        <>
          <GalleryCard
            photos={galleryPhotos}
            onThumbnailClick={handleThumbnailClick}
            span={6}
          />
          {!onOpenGallery && lightboxOpen && (
            <GalleryLightbox
              photos={galleryPhotos}
              initialIndex={lightboxIndex}
              onClose={() => setLightboxOpen(false)}
            />
          )}
        </>
      )}

      {hasSceneSense && <SceneSenseCard scenesense={scenesense!} span={6} />}

      {hasCurator && (
        <div>
          <p className="text-sm text-[#36454F]/90">
            {curatorDisplay}
            {showCuratorReadMore && !curatorExpanded && (
              <button
                type="button"
                onClick={() => setCuratorExpanded(true)}
                className="ml-1 text-[#C3B091] hover:underline"
              >
                Read more
              </button>
            )}
          </p>
        </div>
      )}

      {hasPullQuote && (
        <blockquote className="border-l-2 border-[#C3B091] pl-4 py-1">
          <p className="text-[#36454F]/90 italic">&ldquo;{pullQuote}&rdquo;</p>
          {pullQuoteSource && (
            <cite className="text-xs text-[#36454F]/60 not-italic mt-1 block">
              — {pullQuoteSource}
            </cite>
          )}
        </blockquote>
      )}
    </div>
  );
}
