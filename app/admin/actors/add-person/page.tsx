'use client';

/**
 * Admin Actors → Add Person
 * Manual creation of person actors (chefs, sommeliers, etc.) with optional venue linking.
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';

const PERSON_ROLES = [
  { value: 'chef', label: 'Chef' },
  { value: 'sommelier', label: 'Sommelier' },
  { value: 'pastry_chef', label: 'Pastry Chef' },
  { value: 'beverage_director', label: 'Beverage Director' },
  { value: 'wine_director', label: 'Wine Director' },
] as const;

interface PlaceResult {
  id: string;
  name: string;
  slug: string;
  neighborhood: string | null;
}

interface CreatedActor {
  id: string;
  name: string;
  kind: string;
  slug: string | null;
  website: string | null;
  description: string | null;
}

interface CreatedRelationship {
  id: string;
  entityId: string;
  role: string;
  isPrimary: boolean;
}

export default function AddPersonPage() {
  // Form fields
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('chef');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');

  // Place search
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [searchingPlaces, setSearchingPlaces] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    actor: CreatedActor;
    relationship: CreatedRelationship | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchPlaces = useCallback(async (q: string) => {
    if (q.length < 2) {
      setPlaceResults([]);
      return;
    }
    setSearchingPlaces(true);
    try {
      const res = await fetch(`/api/admin/places/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setPlaceResults(data.places ?? []);
    } catch {
      setPlaceResults([]);
    }
    setSearchingPlaces(false);
  }, []);

  const handlePlaceQueryChange = (value: string) => {
    setPlaceQuery(value);
    setSelectedPlace(null);
    searchPlaces(value);
  };

  const selectPlace = (place: PlaceResult) => {
    setSelectedPlace(place);
    setPlaceQuery(place.name);
    setPlaceResults([]);
  };

  const clearPlace = () => {
    setSelectedPlace(null);
    setPlaceQuery('');
    setPlaceResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/admin/actors/create-person', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          role,
          entityId: selectedPlace?.id ?? undefined,
          isPrimary: true,
          website: website.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to create actor');
      } else {
        setResult({ actor: data.actor, relationship: data.relationship });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    }

    setSubmitting(false);
  };

  const resetForm = () => {
    setName('');
    setRole('chef');
    setWebsite('');
    setDescription('');
    clearPlace();
    setResult(null);
    setError(null);
  };

  return (
    <div className="py-8 px-6">
      <div className="max-w-2xl mx-auto">
        <header className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-[#8B7355] mb-2">
            <Link href="/admin" className="hover:text-[#36454F]">Admin</Link>
            <span>/</span>
            <span className="text-[#36454F] font-medium">Actors</span>
            <span>/</span>
            <span className="text-[#36454F] font-medium">Add Person</span>
          </nav>
          <h1 className="text-2xl font-bold text-[#36454F]">Add Person</h1>
          <p className="text-[#8B7355] text-sm mt-1">
            Create a person actor (chef, sommelier, etc.) and link to a venue
          </p>
        </header>

        {result ? (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-green-800 mb-4">Person created</h2>
              <dl className="grid gap-2 text-sm">
                <div>
                  <dt className="text-green-700">Name</dt>
                  <dd className="font-medium text-green-900">{result.actor.name}</dd>
                </div>
                <div>
                  <dt className="text-green-700">Slug</dt>
                  <dd className="font-mono text-green-900">{result.actor.slug ?? '—'}</dd>
                </div>
                {result.actor.website && (
                  <div>
                    <dt className="text-green-700">Website</dt>
                    <dd>
                      <a
                        href={result.actor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#5BA7A7] hover:underline"
                      >
                        {result.actor.website}
                      </a>
                    </dd>
                  </div>
                )}
                {result.relationship && (
                  <div>
                    <dt className="text-green-700">Linked to</dt>
                    <dd className="font-medium text-green-900">
                      {selectedPlace?.name} ({PERSON_ROLES.find(r => r.value === result.relationship?.role)?.label ?? result.relationship.role})
                    </dd>
                  </div>
                )}
                {result.actor.slug && (
                  <div className="pt-2">
                    <Link
                      href={`/actor/${result.actor.slug}`}
                      className="text-[#5BA7A7] hover:underline text-sm"
                    >
                      View actor page →
                    </Link>
                  </div>
                )}
              </dl>
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetForm}
                className="flex-1 py-2 px-4 bg-[#5BA7A7] text-white rounded-lg hover:bg-[#4a9696] font-medium"
              >
                Add another person
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#36454F] mb-1">
                Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Walter Manzke"
                className="w-full px-4 py-2 border border-[#C3B091]/60 rounded-lg focus:ring-2 focus:ring-[#5BA7A7]/50 focus:border-[#5BA7A7]"
                disabled={submitting}
                required
              />
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-[#36454F] mb-1">
                Role *
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-2 border border-[#C3B091]/60 rounded-lg focus:ring-2 focus:ring-[#5BA7A7]/50 focus:border-[#5BA7A7] bg-white"
                disabled={submitting}
              >
                {PERSON_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Link to venue */}
            <div>
              <label className="block text-sm font-medium text-[#36454F] mb-1">
                Link to venue (optional)
              </label>
              {selectedPlace ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-[#F5F0E8] border border-[#C3B091]/60 rounded-lg">
                  <span className="font-medium text-[#36454F] flex-1">
                    {selectedPlace.name}
                    {selectedPlace.neighborhood && (
                      <span className="text-[#8B7355] font-normal ml-2">
                        {selectedPlace.neighborhood}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={clearPlace}
                    className="text-[#8B7355] hover:text-[#36454F] text-sm"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={placeQuery}
                    onChange={(e) => handlePlaceQueryChange(e.target.value)}
                    placeholder="Search venues by name…"
                    className="w-full px-4 py-2 border border-[#C3B091]/60 rounded-lg focus:ring-2 focus:ring-[#5BA7A7]/50 focus:border-[#5BA7A7]"
                    disabled={submitting}
                  />
                  {searchingPlaces && (
                    <div className="absolute right-3 top-2.5 text-xs text-[#8B7355]">searching…</div>
                  )}
                  {placeResults.length > 0 && (
                    <ul className="absolute z-10 w-full mt-1 bg-white border border-[#C3B091]/40 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {placeResults.map((place) => (
                        <li key={place.id}>
                          <button
                            type="button"
                            onClick={() => selectPlace(place)}
                            className="w-full text-left px-4 py-2 hover:bg-[#F5F0E8] text-sm"
                          >
                            <span className="font-medium text-[#36454F]">{place.name}</span>
                            {place.neighborhood && (
                              <span className="text-[#8B7355] ml-2">{place.neighborhood}</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-[#36454F] mb-1">
                Website (optional)
              </label>
              <input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://…"
                className="w-full px-4 py-2 border border-[#C3B091]/60 rounded-lg focus:ring-2 focus:ring-[#5BA7A7]/50 focus:border-[#5BA7A7]"
                disabled={submitting}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-[#36454F] mb-1">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Executive Chef at République, former Patina Group…"
                rows={2}
                className="w-full px-4 py-2 border border-[#C3B091]/60 rounded-lg focus:ring-2 focus:ring-[#5BA7A7]/50 focus:border-[#5BA7A7] resize-none"
                disabled={submitting}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full py-2 px-4 bg-[#5BA7A7] text-white rounded-lg hover:bg-[#4a9696] disabled:opacity-50 font-medium"
            >
              {submitting ? 'Creating…' : 'Create person'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
