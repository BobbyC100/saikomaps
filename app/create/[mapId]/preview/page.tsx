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
        <Link href={`/create/${mapId}/locations`} className="text-white/60 hover:text-white transition-colors">
          ← Back to Edit
        </Link>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-16">
        {/* Progress */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-[#89B4C4] flex items-center justify-center text-white font-bold text-xs">✓</div>
            <div className="text-white/40">→</div>
            <div className="w-6 h-6 bg-[#89B4C4] flex items-center justify-center text-white font-bold text-xs">✓</div>
            <div className="text-white/40">→</div>
            <div className="w-6 h-6 bg-[#D64541] flex items-center justify-center text-white font-bold text-xs">3</div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Preview Your Map</h1>
          <p className="text-xl text-white/60">Review and publish when ready</p>
        </div>

        {/* Preview Card */}
        <div className="bg-[#2A2A2A] border border-white/10 rounded-xl p-8 mb-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-[#D64541] flex items-center justify-center text-white font-bold text-xs">S</div>
            <div className="w-6 h-6 rounded-full bg-[#89B4C4] flex items-center justify-center text-white font-bold text-xs">A</div>
            <div className="w-6 h-6 bg-white flex items-center justify-center text-[#1A1A1A] font-bold text-xs">I</div>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-4">{mapTitle}</h2>
          <p className="text-white/60 mb-8">{locations.length} locations</p>

          {/* Locations Preview */}
          <div className="space-y-3">
            {locations.map((location, index) => (
              <div
                key={location.id}
                className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-[#D64541] rounded-lg flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium mb-1">{location.name}</div>
                  <div className="text-white/40 text-sm">{location.address}</div>
                </div>
                {location.category && (
                  <div className="px-3 py-1 bg-[#89B4C4]/20 text-[#89B4C4] text-xs font-medium rounded">
                    {location.category}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Link
            href={`/create/${mapId}/locations`}
            className="px-8 py-4 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition-colors"
          >
            ← Add More Locations
          </Link>
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="flex-1 px-8 py-4 bg-[#D64541] text-white font-bold rounded-lg hover:bg-[#C13D39] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPublishing ? 'Publishing...' : 'Publish Map 🚀'}
          </button>
        </div>
      </div>
    </div>
  );
}
