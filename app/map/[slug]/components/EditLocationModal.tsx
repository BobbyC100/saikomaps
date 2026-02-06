'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { MapTemplate } from '@/lib/map-templates';

interface Location {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  userNote: string | null;
  descriptor?: string | null;
  neighborhood?: string | null;
  priceLevel?: number | null;
  cuisineType?: string | null;
}

interface EditLocationModalProps {
  location: Location;
  template: MapTemplate;
  onClose: () => void;
  onSave: (data: Partial<Location>) => Promise<void>;
  isSaving: boolean;
}

export function EditLocationModal({
  location,
  template,
  onClose,
  onSave,
  isSaving,
}: EditLocationModalProps) {
  const [name, setName] = useState(location.name);
  const [address, setAddress] = useState(location.address || '');
  const [phone, setPhone] = useState(location.phone || '');
  const [website, setWebsite] = useState(location.website || '');
  const [neighborhood, setNeighborhood] = useState(location.neighborhood || '');
  const [cuisineType, setCuisineType] = useState(location.cuisineType || '');
  const [priceLevel, setPriceLevel] = useState<number | ''>(location.priceLevel ?? '');
  const [creatorNote, setCreatorNote] = useState(location.descriptor || location.userNote || '');

  useEffect(() => {
    setName(location.name);
    setAddress(location.address || '');
    setPhone(location.phone || '');
    setWebsite(location.website || '');
    setNeighborhood(location.neighborhood || '');
    setCuisineType(location.cuisineType || '');
    setPriceLevel(location.priceLevel ?? '');
    setCreatorNote(location.descriptor || location.userNote || '');
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      name: name.trim(),
      address: address.trim() || null,
      phone: phone.trim() || null,
      website: website.trim() || null,
      neighborhood: neighborhood.trim() || null,
      cuisineType: cuisineType.trim() || null,
      priceLevel: priceLevel === '' ? null : (typeof priceLevel === 'number' ? priceLevel : parseInt(String(priceLevel), 10)),
      descriptor: creatorNote.trim() || null,
      userNote: creatorNote.trim() || null,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: template.bg === '#1A1A1A' ? '#2A2A2A' : '#FFFFFF',
          color: template.text,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
          <h2 className="text-xl font-bold" style={{ color: template.text }}>Edit Location</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
            style={{
              backgroundColor: template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              color: template.textMuted,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: template.text }}>
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: template.bg === '#1A1A1A' ? '#1A1A1A' : '#F5F1EC',
                borderColor: template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : '#E8E3DC',
                color: template.text,
              }}
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: template.text }}>
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: template.bg === '#1A1A1A' ? '#1A1A1A' : '#F5F1EC',
                borderColor: template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : '#E8E3DC',
                color: template.text,
              }}
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: template.text }}>
              Neighborhood
            </label>
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="e.g. Kailua, North Shore"
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: template.bg === '#1A1A1A' ? '#1A1A1A' : '#F5F1EC',
                borderColor: template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : '#E8E3DC',
                color: template.text,
              }}
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: template.text }}>
              Cuisine type
            </label>
            <input
              type="text"
              value={cuisineType}
              onChange={(e) => setCuisineType(e.target.value)}
              placeholder="e.g. Italian, Japanese, Seafood"
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: template.bg === '#1A1A1A' ? '#1A1A1A' : '#F5F1EC',
                borderColor: template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : '#E8E3DC',
                color: template.text,
              }}
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: template.text }}>
              Price level
            </label>
            <select
              value={priceLevel === '' ? 'none' : priceLevel}
              onChange={(e) => setPriceLevel(e.target.value === 'none' ? '' : parseInt(e.target.value, 10))}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: template.bg === '#1A1A1A' ? '#1A1A1A' : '#F5F1EC',
                borderColor: template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : '#E8E3DC',
                color: template.text,
              }}
              disabled={isSaving}
            >
              <option value="none">None</option>
              <option value={1}>$</option>
              <option value={2}>$$</option>
              <option value={3}>$$$</option>
              <option value={4}>$$$$</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: template.text }}>
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: template.bg === '#1A1A1A' ? '#1A1A1A' : '#F5F1EC',
                borderColor: template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : '#E8E3DC',
                color: template.text,
              }}
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: template.text }}>
              Website
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: template.bg === '#1A1A1A' ? '#1A1A1A' : '#F5F1EC',
                borderColor: template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : '#E8E3DC',
                color: template.text,
              }}
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: template.text }}>
              Creator&apos;s note
            </label>
            <textarea
              value={creatorNote}
              onChange={(e) => setCreatorNote(e.target.value.slice(0, 280))}
              rows={3}
              maxLength={280}
              placeholder="Why this place matters to you..."
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 resize-none"
              style={{
                backgroundColor: template.bg === '#1A1A1A' ? '#1A1A1A' : '#F5F1EC',
                borderColor: template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : '#E8E3DC',
                color: template.text,
              }}
              disabled={isSaving}
            />
            <p className="text-xs mt-1" style={{ color: template.textMuted }}>
              {creatorNote.length}/280 characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2 rounded-lg border font-medium transition-colors"
              style={{
                backgroundColor: template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                borderColor: template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : '#E8E3DC',
                color: template.text,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: template.accent }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
