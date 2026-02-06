'use client';

import { useState } from 'react';
import { GripVertical, X } from 'lucide-react';
import { PLACE_FIELD_LIMITS } from '@/lib/mapValidation';
import { buildClientPhotoUrl, getPhotoRefFromStored } from '@/lib/google-places';

/** Colored square with first letter — used when no photo or image fails to load */
const PLACE_FALLBACK_COLORS = ['#6BB8C4', '#D4785C', '#8B9A8B', '#C4A77D'];

function PlaceThumbnail({ placeName, photoUrl }: { placeName: string; photoUrl: string | null }) {
  const [imgError, setImgError] = useState(false);
  const showFallback = !photoUrl || imgError;
  const firstLetter = (placeName?.trim()?.[0] ?? '?').toUpperCase();
  const colorIndex = firstLetter.charCodeAt(0) % PLACE_FALLBACK_COLORS.length;
  const bgColor = PLACE_FALLBACK_COLORS[colorIndex];

  return (
    <div className="flex-shrink-0 w-[50px] h-[50px] rounded-[10px] overflow-hidden bg-[#efe9e3]">
      {showFallback ? (
        <div
          className="w-full h-full flex items-center justify-center text-white font-semibold text-lg"
          style={{ backgroundColor: bgColor }}
        >
          {firstLetter}
        </div>
      ) : (
        <img
          src={photoUrl}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}

interface MapPlaceWithPlace {
  id: string;
  descriptor?: string | null;
  orderIndex: number;
  place: {
    name: string;
    category?: string | null;
    neighborhood?: string | null;
    googlePhotos?: unknown;
  };
}

interface PlaceIndexSectionProps {
  mapPlaces: MapPlaceWithPlace[];
  errors: Record<string, string>;
  onAddPlace: () => void;
  onRemovePlace: (id: string) => void;
  onReorderPlace: (id: string, direction: 'up' | 'down') => void;
  onDescriptorChange: (id: string, descriptor: string) => void;
  onDescriptorBlur?: (locationId: string) => void;
}

function getPlacePhotoUrl(place: MapPlaceWithPlace['place']): string | null {
  // Handle both camelCase (Prisma) and snake_case (raw API) field names
  const raw = (place as { googlePhotos?: unknown; google_photos?: unknown }).googlePhotos
    ?? (place as { google_photos?: unknown }).google_photos;
  if (!raw) return null;
  const arr = Array.isArray(raw) ? raw : [raw];
  if (arr.length === 0) return null;
  const first = arr[0];
  const ref = getPhotoRefFromStored(first as { photo_reference?: string; photoReference?: string; name?: string } | string);
  if (!ref) return null;
  return buildClientPhotoUrl(ref, 200);
}

export default function PlaceIndexSection({
  mapPlaces,
  errors,
  onAddPlace,
  onRemovePlace,
  onReorderPlace,
  onDescriptorChange,
  onDescriptorBlur,
}: PlaceIndexSectionProps) {
  return (
    <section id="places" className="scroll-mt-8">
      <div className="space-y-3 mb-4">
        {mapPlaces.map((mp, index) => {
          const photoUrl = getPlacePhotoUrl(mp.place);
          return (
            <div
              key={mp.id}
              className="bg-white rounded-[14px] p-4 flex gap-3 items-start"
              style={{
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                animation: 'slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
                animationDelay: `${index * 0.08}s`,
              }}
            >
              {/* Drag handle */}
              <div className="flex flex-col items-center gap-0.5 flex-shrink-0 opacity-40">
                <GripVertical className="w-4 h-4 text-[#6B6B6B]" />
                <div className="flex flex-col -mt-1">
                  <button
                    type="button"
                    onClick={() => onReorderPlace(mp.id, 'up')}
                    disabled={index === 0}
                    className="p-0.5 text-[#6B6B6B] hover:text-[#D4785C] disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => onReorderPlace(mp.id, 'down')}
                    disabled={index === mapPlaces.length - 1}
                    className="p-0.5 text-[#6B6B6B] hover:text-[#D4785C] disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                </div>
              </div>

              {/* Photo thumbnail — use img with onError fallback for Google Places URLs */}
              <PlaceThumbnail placeName={mp.place.name} photoUrl={photoUrl} />

              <div className="flex-1 min-w-0">
                <div
                  style={{
                    fontFamily: 'Instrument Serif, serif',
                    fontSize: '16px',
                    color: '#2D2D2D',
                    marginBottom: '2px',
                  }}
                >
                  {mp.place.name}
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  {mp.place.neighborhood && (
                    <span className="text-xs text-[#6B6B6B]">{mp.place.neighborhood}</span>
                  )}
                  {mp.place.category && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: '#D4785C' }}
                    >
                      {mp.place.category}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={mp.descriptor || ''}
                  onChange={(e) =>
                    onDescriptorChange(
                      mp.id,
                      e.target.value.slice(0, PLACE_FIELD_LIMITS.descriptor.max)
                    )
                  }
                  onBlur={() => onDescriptorBlur?.(mp.id)}
                  placeholder="Add a one-liner..."
                  className="w-full px-0 py-1 bg-transparent border-0 border-b border-transparent focus:outline-none focus:ring-0 focus:border-[#D4785C] focus:border-b text-sm text-[#6B6B6B] placeholder:text-[#9A9A9A] placeholder:italic"
                />
              </div>

              <button
                type="button"
                onClick={() => onRemovePlace(mp.id)}
                className="p-2 text-[#9A9A9A] hover:text-[#C0392B] rounded transition-colors flex-shrink-0"
                aria-label="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAddPlace}
        className="w-full py-3 border-2 border-dashed border-[#efe9e3] rounded-[14px] text-[#6B6B6B] hover:border-[#D4785C] hover:text-[#D4785C] hover:bg-[#D4785C]/5 transition-colors font-medium"
      >
        + Add Place
      </button>
    </section>
  );
}
