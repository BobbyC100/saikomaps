'use client';

export interface SkateSpot {
  id: string;
  name: string;
  slug: string | null;
  spotType: string | null;
  tags: string[];
  surface: string | null;
  skillLevel: string | null;
  description: string | null;
  region: string | null;
  source: string;
  sourceUrl: string | null;
}

interface SkateSpotDetailPanelProps {
  spot: SkateSpot;
  onClose: () => void;
}

const SPOT_TYPE_LABELS: Record<string, string> = {
  park: 'Park',
  street: 'Street',
  plaza: 'Plaza',
  school: 'School',
};

export function SkateSpotDetailPanel({ spot, onClose }: SkateSpotDetailPanelProps) {
  const typeLabel = spot.spotType ? SPOT_TYPE_LABELS[spot.spotType] || spot.spotType : null;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-gray-900">{spot.name}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {typeLabel && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#3D5A80]/15 text-[#3D5A80]">
              {typeLabel}
            </span>
          )}
          {spot.tags?.length > 0 && spot.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
            >
              {tag}
            </span>
          ))}
        </div>

        {spot.surface && (
          <p className="mt-2 text-sm text-gray-600">
            Surface: <span className="font-medium">{spot.surface}</span>
          </p>
        )}

        {spot.skillLevel && (
          <p className="mt-1 text-sm text-gray-600">
            Skill: <span className="font-medium">{spot.skillLevel}</span>
          </p>
        )}

        {spot.description && (
          <p className="mt-3 text-sm text-gray-700">{spot.description}</p>
        )}

        {/* Source attribution — always show for sparse OSM data; link when URL exists */}
        <p className="mt-3 text-xs text-gray-500">
          {spot.sourceUrl ? (
            <a
              href={spot.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#3D5A80]"
            >
              via {spot.source === 'OSM' ? 'OpenStreetMap' : spot.source}
            </a>
          ) : (
            <>via {spot.source === 'OSM' ? 'OpenStreetMap' : spot.source}</>
          )}
        </p>
      </div>
    </div>
  );
}
