'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SaikoLogo } from '@/components/ui/SaikoLogo';

interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
}

const templates: Template[] = [
  { id: 'postcard', name: 'Postcard', description: 'Vintage postcard vibes', preview: 'postcard' },
  { id: 'field-notes', name: 'Field Notes', description: 'Clean notebook aesthetic', preview: 'field-notes' },
  { id: 'monocle', name: 'Monocle', description: 'Sophisticated editorial', preview: 'monocle' },
  { id: 'street', name: 'Street', description: 'Bold urban energy', preview: 'street' },
];

export default function CreateMapPage() {
  const router = useRouter();
  const [mapName, setMapName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!mapName.trim()) {
      setError('Please enter a map name');
      return;
    }
    if (!selectedTemplate) {
      setError('Please select a template');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Create the map
      const response = await fetch('/api/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: mapName,
          template: selectedTemplate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create map');
      }

      const { data } = await response.json();
      
      // Redirect to add locations step
      router.push(`/create/${data.id}/locations`);
    } catch (err) {
      setError('Failed to create map. Please try again.');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <SaikoLogo href="/dashboard" variant="light" className="scale-[1.25]" />
        <Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">
          ← Back to Dashboard
        </Link>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-[#D64541] flex items-center justify-center text-white font-bold text-xs">1</div>
            <div className="text-white/40">→</div>
            <div className="w-6 h-6 bg-white/10 flex items-center justify-center text-white/40 font-bold text-xs">2</div>
            <div className="text-white/40">→</div>
            <div className="w-6 h-6 bg-white/10 flex items-center justify-center text-white/40 font-bold text-xs">3</div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Create Your Map</h1>
          <p className="text-xl text-white/60">Give it a name and pick a style</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-[#D64541]/10 border border-[#D64541]/30 rounded-lg">
            <p className="text-[#D64541]">{error}</p>
          </div>
        )}

        {/* Map Name */}
        <div className="mb-12">
          <label className="block text-white font-medium mb-3">Map Name</label>
          <input
            type="text"
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            placeholder="e.g., Tokyo Coffee Guide, NYC Hidden Gems..."
            className="w-full px-6 py-4 bg-[#2A2A2A] border border-white/10 rounded-xl text-white text-lg placeholder:text-white/30 focus:outline-none focus:border-[#89B4C4] transition-colors"
          />
        </div>

        {/* Template Selection */}
        <div className="mb-12">
          <label className="block text-white font-medium mb-4">Choose Template</label>
          <div className="grid grid-cols-2 gap-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`p-6 rounded-xl text-left transition-all ${
                  selectedTemplate === template.id
                    ? 'bg-[#89B4C4]/20 border-2 border-[#89B4C4]'
                    : 'bg-[#2A2A2A] border-2 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-bold text-lg mb-1">{template.name}</h3>
                    <p className="text-white/60 text-sm">{template.description}</p>
                  </div>
                  {selectedTemplate === template.id && (
                    <div className="w-6 h-6 rounded-full bg-[#89B4C4] flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Mini preview */}
                <div className="h-24 bg-white/5 rounded-lg"></div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleCreate}
            disabled={isCreating || !mapName.trim() || !selectedTemplate}
            className="flex-1 px-8 py-4 bg-[#D64541] text-white font-bold rounded-lg hover:bg-[#C13D39] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCreating ? 'Creating...' : 'Continue to Add Locations →'}
          </button>
        </div>
      </div>
    </div>
  );
}
