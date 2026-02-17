'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SaikoLogo } from '@/components/ui/SaikoLogo';
import AddLocationModal from '@/components/AddLocationModal';

interface Location {
  id: string;
  name: string;
  address: string;
  category: string | null;
}

export default function AddLocationsPage({ params }: { params: Promise<{ mapId: string }> }) {
  const router = useRouter();
  const [mapId, setMapId] = useState<string>('');
  const [mapTitle, setMapTitle] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleContinue = () => {
    if (locations.length === 0) {
      alert('Please add at least one location before continuing');
      return;
    }
    router.push(`/create/${mapId}/preview`);
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
        <Link href="/dashboard" className="text-[var(--charcoal)]/60 hover:text-[var(--charcoal)] transition-colors text-sm">
          ← Save & Exit
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="mb-12">
          <h1 className="text-3xl font-normal text-[var(--charcoal)] mb-2" style={{ fontFamily: 'var(--font-libre)', fontStyle: 'italic' }}>{mapTitle}</h1>
          <p className="text-[var(--charcoal)]/60 text-sm">Add your favorite spots</p>
        </div>

        <div className="mb-8">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full px-6 py-8 bg-[var(--warm-white)] border-2 border-dashed border-[var(--charcoal)]/20 rounded-xl hover:border-[var(--charcoal)]/40 hover:bg-[var(--charcoal)]/5 transition-all text-center"
          >
            <div className="text-4xl mb-3">📍</div>
            <div className="text-[var(--charcoal)] font-semibold text-lg mb-1">Add Location</div>
            <div className="text-[var(--charcoal)]/60 text-sm">Search or paste a Google Maps link</div>
          </button>
        </div>

        {locations.length > 0 && (
          <div className="mb-12 space-y-3">
            <h2 className="text-[var(--charcoal)] font-semibold mb-4 uppercase tracking-wider text-sm">{locations.length} Location{locations.length !== 1 ? 's' : ''} Added</h2>
            {locations.map((location, index) => (
              <div
                key={location.id}
                className="bg-[var(--warm-white)] border border-[var(--charcoal)]/10 rounded-xl p-4 flex items-center gap-4"
              >
                <div className="w-8 h-8 bg-[var(--charcoal)] text-[var(--parchment)] rounded-xl flex items-center justify-center font-semibold text-sm">
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
        )}

        <div className="flex gap-4">
          <Link
            href="/dashboard"
            className="px-8 py-4 border border-[var(--charcoal)]/20 text-[var(--charcoal)] font-semibold rounded-xl hover:border-[var(--charcoal)]/40 transition-colors text-sm tracking-wider uppercase"
          >
            Save Draft
          </Link>
          <button
            onClick={handleContinue}
            disabled={locations.length === 0}
            className="flex-1 px-8 py-4 bg-[var(--charcoal)] text-[var(--parchment)] font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm tracking-wider uppercase"
          >
            Continue to Preview →
          </button>
        </div>
      </div>

      {/* Add Location Modal */}
      <AddLocationModal
        listSlug={mapId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          loadMap(mapId);
        }}
      />
    </div>
  );
}
