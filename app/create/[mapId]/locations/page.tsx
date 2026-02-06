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
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <SaikoLogo href="/dashboard" variant="light" className="scale-[1.25]" />
        <Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">
          ← Save & Exit
        </Link>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-16">
        {/* Progress */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-[#89B4C4] flex items-center justify-center text-white font-bold text-xs">✓</div>
            <div className="text-white/40">→</div>
            <div className="w-6 h-6 bg-[#D64541] flex items-center justify-center text-white font-bold text-xs">2</div>
            <div className="text-white/40">→</div>
            <div className="w-6 h-6 bg-white/10 flex items-center justify-center text-white/40 font-bold text-xs">3</div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">{mapTitle}</h1>
          <p className="text-xl text-white/60">Add your favorite spots</p>
        </div>

        {/* Add Location Button */}
        <div className="mb-8">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full px-6 py-8 bg-[#2A2A2A] border-2 border-dashed border-white/20 rounded-xl hover:border-[#89B4C4] hover:bg-[#89B4C4]/5 transition-all text-center"
          >
            <div className="text-4xl mb-3">📍</div>
            <div className="text-white font-bold text-lg mb-1">Add Location</div>
            <div className="text-white/60 text-sm">Search or paste a Google Maps link</div>
          </button>
        </div>

        {/* Locations List */}
        {locations.length > 0 && (
          <div className="mb-12 space-y-3">
            <h2 className="text-white font-bold mb-4">{locations.length} Location{locations.length !== 1 ? 's' : ''} Added</h2>
            {locations.map((location, index) => (
              <div
                key={location.id}
                className="bg-[#2A2A2A] border border-white/10 rounded-lg p-4 flex items-center gap-4"
              >
                <div className="w-8 h-8 bg-[#D64541] rounded flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium mb-1">{location.name}</div>
                  <div className="text-white/50 text-sm">{location.address}</div>
                </div>
                {location.category && (
                  <div className="px-3 py-1 bg-[#89B4C4]/20 text-[#89B4C4] text-xs font-medium rounded">
                    {location.category}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition-colors"
          >
            Save Draft
          </Link>
          <button
            onClick={handleContinue}
            disabled={locations.length === 0}
            className="flex-1 px-8 py-4 bg-[#D64541] text-white font-bold rounded-lg hover:bg-[#C13D39] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
