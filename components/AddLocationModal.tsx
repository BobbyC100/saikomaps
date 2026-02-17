'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { extractPlaceId, isGoogleMapsUrl } from '@/lib/utils/googleMapsParser';
import type { PlaceSearchResult, PlaceDetails } from '@/lib/google-places';

interface AddLocationModalProps {
  listSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddLocationModal({
  listSlug,
  isOpen,
  onClose,
  onSuccess,
}: AddLocationModalProps) {
  const [linkInput, setLinkInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // CSV upload state
  const [csvStatus, setCsvStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [csvProgress, setCsvProgress] = useState<string>('');
  const [csvResult, setCsvResult] = useState<{ added: number; total: number; failedToResolve: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLinkInput('');
      setSearchInput('');
      setSearchResults([]);
      setSelectedPlace(null);
      setError('');
      setShowSuccess(false);
      setCsvStatus('idle');
      setCsvProgress('');
      setCsvResult(null);
    }
  }, [isOpen]);

  // Handle link input
  const handleLinkInput = async (value: string) => {
    setLinkInput(value);
    setSearchInput(''); // Clear search when using link
    setSearchResults([]);
    setError('');
    setSelectedPlace(null);

    if (!value) return;

    if (!isGoogleMapsUrl(value)) {
      setError('Please enter a valid Google Maps URL');
      return;
    }

    const placeId = extractPlaceId(value);

    if (!placeId) {
      if (value.includes('maps.app.goo.gl')) {
        setError('Please use the full Google Maps URL instead of the short link');
      } else {
        setError('Could not extract place ID from this URL. Try searching instead.');
      }
      return;
    }

    // Fetch place details
    setIsLoading(true);
    try {
      const response = await fetch(`/api/places/details/${encodeURIComponent(placeId)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch place details');
      }

      setSelectedPlace(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch place details');
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (!searchInput || searchInput.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/places/search?query=${encodeURIComponent(searchInput)}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Search failed');
        }

        setSearchResults(data.data || []);
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Handle search input
  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    setLinkInput(''); // Clear link when using search
    setError('');
    setSelectedPlace(null);
  };

  // Select a search result
  const handleSelectResult = async (result: PlaceSearchResult) => {
    setSearchResults([]);
    setSearchInput(result.name);

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/places/details/${encodeURIComponent(result.placeId)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch place details');
      }

      setSelectedPlace(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch place details');
    } finally {
      setIsLoading(false);
    }
  };

  // Add location to list
  const handleAddLocation = async () => {
    if (!selectedPlace) return;

    setIsLoading(true);
    setError('');

    try {
      // Check if this is demo mode (test page) or real mode
      const isDemo = listSlug === 'test-guide';
      
      if (isDemo) {
        // Demo mode - just simulate
        await new Promise(resolve => setTimeout(resolve, 800));
        setShowSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        // Real mode - actually save to database
        const response = await fetch(`/api/lists/${listSlug}/locations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            placeId: selectedPlace.placeId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('Add location failed:', response.status, data);
          throw new Error(data.error || `Failed to add location (${response.status})`);
        }

        setShowSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add location');
    } finally {
      setIsLoading(false);
    }
  };

  // CSV upload handler
  const handleCsvUpload = useCallback(
    async (file: File) => {
      if (listSlug === 'test-guide') {
        setCsvStatus('error');
        setError('CSV upload not available in demo mode');
        return;
      }

      let placeCount = 0;
      try {
        const text = await file.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        placeCount = (parsed.data as Record<string, unknown>[]).filter(
          (row) => (row.Title || row.Name || row.name) && String(row.Title || row.Name || row.name).trim()
        ).length;
      } catch {
        // Fallback if parse fails
      }

      setCsvStatus('processing');
      setCsvProgress(placeCount > 0 ? `Processing ${placeCount} places...` : 'Processing...');
      setError('');

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('listId', listSlug);

        const res = await fetch('/api/import/add-to-list', {
          method: 'POST',
          body: formData,
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || 'Failed to add places');
        }

        const { added, total, failedToResolve } = json.data;
        setCsvResult({ added, total, failedToResolve });
        setCsvStatus('done');
        setCsvProgress('');

        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } catch (err) {
        setCsvStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to add places from CSV');
      }
    },
    [listSlug, onSuccess, onClose]
  );

  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.csv')) {
      handleCsvUpload(file);
    } else if (file) {
      setError('Please select a .csv file');
    }
    e.target.value = '';
  };

  const handleCsvDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.csv')) {
      handleCsvUpload(file);
    } else if (file) {
      setError('Please drop a .csv file');
    }
  };

  const handleCsvDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleCsvDragLeave = () => {
    setIsDragOver(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-5">
      <div className="bg-[var(--warm-white)] w-full max-w-[560px] max-h-[90vh] overflow-hidden shadow-2xl animate-slideUp" style={{ borderRadius: '12px' }}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--charcoal)]/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--charcoal)]">Add Location to Guide</h2>
          <button
            onClick={onClose}
            className="text-[var(--charcoal)]/60 hover:text-[var(--charcoal)] hover:bg-[var(--charcoal)]/5 p-2 transition-colors"
            style={{ borderRadius: '12px' }}
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Success Message */}
          {showSuccess && (
            <div className="mb-4 bg-[var(--charcoal)]/10 border border-[var(--charcoal)]/20 text-[var(--charcoal)] px-4 py-3 text-sm animate-slideUp" style={{ borderRadius: '12px' }}>
              <strong className="font-semibold">✓ Location added!</strong> {selectedPlace?.name} has been added to your guide.
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] px-4 py-3 text-sm" style={{ borderRadius: '12px' }}>
              {error}
            </div>
          )}

          {/* Link Input */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-[var(--charcoal)] mb-2">
              Paste Google Maps link
            </label>
            <input
              type="text"
              value={linkInput}
              onChange={(e) => handleLinkInput(e.target.value)}
              placeholder="https://maps.app.goo.gl/... or full Google Maps URL"
              className="w-full px-3.5 py-2.5 border border-[var(--charcoal)]/20 text-[var(--charcoal)] text-sm focus:outline-none focus:border-[var(--charcoal)]/40 transition-colors"
              style={{ borderRadius: '12px' }}
            />
            <p className="mt-1.5 text-xs text-[var(--charcoal)]/50">
              Paste a link from Google Maps
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center text-center my-5">
            <div className="flex-1 border-t border-[var(--charcoal)]/10"></div>
            <span className="px-4 text-xs font-medium text-[var(--charcoal)]/50">OR</span>
            <div className="flex-1 border-t border-[var(--charcoal)]/10"></div>
          </div>

          {/* Search Input */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-[var(--charcoal)] mb-2">
              Search for a place
            </label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="e.g. Bacchanal Wine Bar, New Orleans"
              className="w-full px-3.5 py-2.5 border border-[var(--charcoal)]/20 text-[var(--charcoal)] text-sm focus:outline-none focus:border-[var(--charcoal)]/40 transition-colors"
              style={{ borderRadius: '12px' }}
            />

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-3 border border-[var(--charcoal)]/10 overflow-hidden bg-[var(--warm-white)]" style={{ borderRadius: '12px' }}>
                {searchResults.map((result) => (
                  <button
                    key={result.placeId}
                    onClick={() => handleSelectResult(result)}
                    className="w-full text-left px-3.5 py-3 border-b border-[var(--charcoal)]/10 last:border-b-0 hover:bg-[var(--charcoal)]/5 transition-colors"
                  >
                    <div className="font-medium text-sm text-[var(--charcoal)] mb-0.5">
                      {result.name}
                    </div>
                    <div className="text-xs text-[var(--charcoal)]/50">{result.address}</div>
                  </button>
                ))}
              </div>
            )}

            {isSearching && (
              <div className="mt-3 text-center text-sm text-[var(--charcoal)]/50">
                Searching...
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center text-center my-5">
            <div className="flex-1 border-t border-[var(--charcoal)]/10"></div>
            <span className="px-4 text-xs font-medium text-[var(--charcoal)]/50">OR</span>
            <div className="flex-1 border-t border-[var(--charcoal)]/10"></div>
          </div>

          {/* CSV Upload */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-[var(--charcoal)] mb-2">
              Upload CSV
            </label>
            {csvStatus === 'processing' && (
              <div className="py-6 text-center border border-[var(--charcoal)]/10 bg-[var(--charcoal)]/5" style={{ borderRadius: '12px' }}>
                <div className="inline-block w-8 h-8 border-2 border-[var(--charcoal)]/20 border-t-[var(--charcoal)]/60 rounded-full animate-spin mb-2"></div>
                <div className="text-sm text-[var(--charcoal)]/60">{csvProgress || 'Processing places...'}</div>
              </div>
            )}
            {csvStatus === 'done' && csvResult && (
              <div className="py-4 px-4 bg-[var(--charcoal)]/10 border border-[var(--charcoal)]/20 text-[var(--charcoal)] text-sm" style={{ borderRadius: '12px' }}>
                {csvResult.failedToResolve > 0 ? (
                  <>
                    <strong>Added {csvResult.added} of {csvResult.total} places.</strong> {csvResult.failedToResolve} couldn&apos;t be found.
                  </>
                ) : (
                  <>
                    <strong>Added {csvResult.added} places!</strong>
                  </>
                )}
              </div>
            )}
            {csvStatus !== 'processing' && csvStatus !== 'done' && (
              <div
                className={`border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
                  isDragOver ? 'border-[var(--charcoal)]/40 bg-[var(--charcoal)]/5' : 'border-[var(--charcoal)]/20 hover:border-[var(--charcoal)]/40 hover:bg-[var(--charcoal)]/5'
                }`}
                style={{ borderRadius: '12px' }}
                onClick={() => csvFileInputRef.current?.click()}
                onDrop={handleCsvDrop}
                onDragOver={handleCsvDragOver}
                onDragLeave={handleCsvDragLeave}
                data-testid="csv-upload-zone"
              >
                <input
                  ref={csvFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileSelect}
                  className="sr-only"
                  aria-hidden
                  data-testid="csv-file-input"
                />
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--charcoal)]/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[var(--charcoal)]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-[var(--charcoal)] mb-1">or drag & drop</p>
                <p className="text-xs text-[var(--charcoal)]/50 mb-4">Accepts .csv files (e.g. Google Maps export)</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    csvFileInputRef.current?.click();
                  }}
                  className="inline-block px-4 py-2 text-sm font-semibold text-[var(--parchment)] uppercase tracking-wider cursor-pointer transition-colors hover:opacity-90 bg-[var(--charcoal)]"
                  style={{ borderRadius: '12px' }}
                  data-testid="csv-choose-file-btn"
                >
                  Add files
                </button>
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoading && !showSuccess && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-2 border-[var(--charcoal)]/20 border-t-[var(--charcoal)]/60 rounded-full animate-spin mb-2"></div>
              <div className="text-sm text-[var(--charcoal)]/50">Fetching location details...</div>
            </div>
          )}

          {/* Preview Card */}
          {selectedPlace && !isLoading && (
            <div className="mt-5 border border-[var(--charcoal)]/10 p-4 bg-[var(--charcoal)]/5 animate-slideUp" style={{ borderRadius: '12px' }}>
              <div className="flex items-start gap-3.5 mb-3.5">
                <div className="w-18 h-18 rounded-xl bg-[var(--charcoal)]/10 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-[var(--charcoal)] mb-1">
                    {selectedPlace.name}
                  </div>
                  <div className="text-xs text-[var(--charcoal)]/50 line-clamp-2">
                    {selectedPlace.formattedAddress}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3.5 border-t border-[var(--charcoal)]/10">
                {selectedPlace.types && selectedPlace.types.length > 0 && (
                  <div>
                    <div className="text-[11px] text-[var(--charcoal)]/50 mb-0.5">Category</div>
                    <div className="text-xs font-medium text-[var(--charcoal)] capitalize">
                      {selectedPlace.types[0].replace(/_/g, ' ')}
                    </div>
                  </div>
                )}
                {selectedPlace.formattedPhoneNumber && (
                  <div>
                    <div className="text-[11px] text-[var(--charcoal)]/50 mb-0.5">Phone</div>
                    <div className="text-xs font-medium text-[var(--charcoal)]">
                      {selectedPlace.formattedPhoneNumber}
                    </div>
                  </div>
                )}
                {selectedPlace.rating && (
                  <div>
                    <div className="text-[11px] text-[var(--charcoal)]/50 mb-0.5">Rating</div>
                    <div className="text-xs font-medium text-[var(--charcoal)]">
                      {selectedPlace.rating} ⭐ ({selectedPlace.userRatingsTotal})
                    </div>
                  </div>
                )}
                {selectedPlace.openingHours && (
                  <div>
                    <div className="text-[11px] text-[var(--charcoal)]/50 mb-0.5">Status</div>
                    <div className="text-xs font-medium text-[var(--charcoal)]">
                      {selectedPlace.openingHours.openNow ? 'Open now' : 'Closed'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--charcoal)]/10 flex gap-2.5 justify-end bg-[var(--charcoal)]/5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[var(--charcoal)] uppercase tracking-wider bg-[var(--warm-white)] border border-[var(--charcoal)]/20 hover:border-[var(--charcoal)]/40 transition-colors disabled:cursor-not-allowed"
            style={{ borderRadius: '12px' }}
          >
            Cancel
          </button>
          <button
            onClick={handleAddLocation}
            disabled={!selectedPlace || isLoading || showSuccess}
            className="px-4 py-2 text-sm font-semibold text-[var(--parchment)] uppercase tracking-wider bg-[var(--charcoal)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ borderRadius: '12px' }}
          >
            {showSuccess ? 'Added ✓' : 'Add to Guide'}
          </button>
        </div>
      </div>
    </div>
  );
}
