'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SaikoLogo } from '@/components/ui/SaikoLogo';

interface Location {
  id: string;
  name: string;
  address: string;
  category: string | null;
  orderIndex: number;
}

export default function PreviewPage({ params }: { params: Promise<{ mapId: string }> }) {
  const router = useRouter();
  const [mapId, setMapId] = useState<string>('');
  const [mapTitle, setMapTitle] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    params.then(p => {
      setMapId(p.mapId);
      loadMap(p.mapId);
    });
  }, [params]);

  const loadMap = async (id: string) => {
    try {
      const response = await fetch(`/api/maps/${id}`);
      if (response.ok) {
        const { data } = await response.json();
        setMapTitle(data.title);
        setLocations(data.locations || []);
      }
    } catch (error) {
      console.error('Error loading map:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      // Publish the map
      const response = await fetch(`/api/maps/${mapId}/publish`, {
        method: 'POST',
      });

      if (response.ok) {
        const { data } = await response.json();
        // Redirect to the live map
        router.push(`/map/${data.slug}`);
      }
    } catch (error) {
      console.error('Error publishing map:', error);
      alert('Failed to publish map');
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--parchment)] flex items-center justify-center">
        <div className="text-[var(--charcoal)]/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--parchment)]">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-[var(--charcoal)]/10">
        <SaikoLogo href="/dashboard" variant="dark" />
        <Link href={`/create/${mapId}/locations`} className="text-[var(--charcoal)]/60 hover:text-[var(--charcoal)] transition-colors text-sm">
          ← Back to Edit
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="mb-12">
          <h1 className="text-3xl font-normal text-[var(--charcoal)] mb-2" style={{ fontFamily: 'var(--font-libre)', fontStyle: 'italic' }}>Preview Your Map</h1>
          <p className="text-[var(--charcoal)]/60 text-sm">Review and publish when ready</p>
        </div>

        <div className="bg-[var(--warm-white)] border border-[var(--charcoal)]/10 rounded-xl p-8 mb-12">
          <h2 className="text-2xl font-normal text-[var(--charcoal)] mb-2" style={{ fontFamily: 'var(--font-libre)', fontStyle: 'italic' }}>{mapTitle}</h2>
          <p className="text-[var(--charcoal)]/60 mb-8 text-sm">{locations.length} locations</p>

          <div className="space-y-3">
            {locations.map((location, index) => (
              <div
                key={location.id}
                className="bg-white border border-[var(--charcoal)]/10 rounded-xl p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-[var(--charcoal)] text-[var(--parchment)] rounded-xl flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="text-[var(--charcoal)] font-medium mb-1">{location.name}</div>
                  <div className="text-[var(--charcoal)]/50 text-sm">{location.address}</div>
                </div>
                {location.category && (
                  <div className="px-3 py-1 bg-[var(--leather)]/15 text-[var(--leather)] text-xs font-medium rounded-xl">
                    {location.category}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <Link
            href={`/create/${mapId}/locations`}
            className="px-8 py-4 border border-[var(--charcoal)]/20 text-[var(--charcoal)] font-semibold rounded-xl hover:border-[var(--charcoal)]/40 transition-colors text-sm tracking-wider uppercase"
          >
            ← Add More Locations
          </Link>
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="flex-1 px-8 py-4 bg-[var(--charcoal)] text-[var(--parchment)] font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm tracking-wider uppercase"
          >
            {isPublishing ? 'Publishing...' : 'Publish Map'}
          </button>
        </div>
      </div>
    </div>
  );
}
