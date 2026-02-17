'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SaikoLogo } from '@/components/ui/SaikoLogo';

export default function CreateMapPage() {
  const router = useRouter();
  const [mapName, setMapName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!mapName.trim()) {
      setError('Please enter a map name');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const response = await fetch('/api/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: mapName,
          template: 'field-notes',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create map');
      }

      const { data } = await response.json();
      router.push(`/create/${data.id}/locations`);
    } catch (err) {
      setError('Failed to create map. Please try again.');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--parchment)]">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-[var(--charcoal)]/10">
        <SaikoLogo href="/dashboard" variant="dark" />
        <Link href="/dashboard" className="text-[var(--charcoal)]/60 hover:text-[var(--charcoal)] transition-colors text-sm">
          ← Back to Dashboard
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="mb-12">
          <h1 className="text-3xl font-normal text-[var(--charcoal)] mb-2" style={{ fontFamily: 'var(--font-libre)', fontStyle: 'italic' }}>Create Your Map</h1>
          <p className="text-[var(--charcoal)]/60 text-sm">Give it a name and pick a style</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-xl">
            <p className="text-sm text-[var(--error)]">{error}</p>
          </div>
        )}

        <div className="mb-12">
          <label className="block text-sm font-medium text-[var(--charcoal)]/80 mb-2">Map Name</label>
          <input
            type="text"
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            placeholder="e.g., Tokyo Coffee Guide, NYC Hidden Gems..."
            className="w-full px-6 py-4 bg-[var(--warm-white)] border border-[var(--charcoal)]/10 text-[var(--charcoal)] placeholder:text-[var(--charcoal)]/30 focus:outline-none focus:border-[var(--charcoal)]/30 transition-colors rounded-xl"
          />
          <p className="mt-3 text-[var(--charcoal)]/50 text-sm">Using Field Notes template</p>
        </div>

        <div className="flex gap-4">
          <Link
            href="/dashboard"
            className="px-8 py-4 border border-[var(--charcoal)]/20 text-[var(--charcoal)] font-semibold rounded-xl hover:border-[var(--charcoal)]/40 transition-colors text-sm tracking-wider uppercase"
          >
            Cancel
          </Link>
          <button
            onClick={handleCreate}
            disabled={isCreating || !mapName.trim()}
            className="flex-1 px-8 py-4 bg-[var(--charcoal)] text-[var(--parchment)] font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm tracking-wider uppercase"
          >
            {isCreating ? 'Creating...' : 'Continue to Add Locations →'}
          </button>
        </div>
      </div>
    </div>
  );
}
