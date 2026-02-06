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
      <div className="bg-white rounded-xl w-full max-w-[560px] max-h-[90vh] overflow-hidden shadow-2xl animate-slideUp">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add Location to Guide</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg p-2 transition-colors"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Success Message */}
          {showSuccess && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm animate-slideUp">
              <strong className="font-semibold">✓ Location added!</strong> {selectedPlace?.name} has been added to your guide.
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Link Input */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Paste Google Maps link
            </label>
            <input
              type="text"
              value={linkInput}
              onChange={(e) => handleLinkInput(e.target.value)}
              placeholder="https://maps.app.goo.gl/... or full Google Maps URL"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Paste a link from Google Maps
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center text-center my-5">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-xs font-medium text-gray-400">OR</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {/* Search Input */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Search for a place
            </label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="e.g. Bacchanal Wine Bar, New Orleans"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all"
            />

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden bg-white">
                {searchResults.map((result) => (
                  <button
                    key={result.placeId}
                    onClick={() => handleSelectResult(result)}
                    className="w-full text-left px-3.5 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-sm text-gray-900 mb-0.5">
                      {result.name}
                    </div>
                    <div className="text-xs text-gray-500">{result.address}</div>
                  </button>
                ))}
              </div>
            )}

            {isSearching && (
              <div className="mt-3 text-center text-sm text-gray-500">
                Searching...
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center text-center my-5">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-xs font-medium text-gray-400">OR</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {/* CSV Upload */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Upload CSV
            </label>
            {csvStatus === 'processing' && (
              <div className="py-6 text-center border border-gray-200 rounded-lg bg-gray-50">
                <div className="inline-block w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin mb-2"></div>
                <div className="text-sm text-gray-600">{csvProgress || 'Processing places...'}</div>
              </div>
            )}
            {csvStatus === 'done' && csvResult && (
              <div className="py-4 px-4 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
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
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  isDragOver ? 'border-gray-400 bg-gray-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50/50'
                }`}
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
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700 mb-1">or drag & drop</p>
                <p className="text-xs text-gray-400 mb-4">Accepts .csv files (e.g. Google Maps export)</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    csvFileInputRef.current?.click();
                  }}
                  className="inline-block px-4 py-2 text-sm font-medium text-white rounded-lg cursor-pointer transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#E07A5F' }}
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
              <div className="inline-block w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin mb-2"></div>
              <div className="text-sm text-gray-500">Fetching location details...</div>
            </div>
          )}

          {/* Preview Card */}
          {selectedPlace && !isLoading && (
            <div className="mt-5 border border-gray-200 rounded-xl p-4 bg-gray-50 animate-slideUp">
              <div className="flex items-start gap-3.5 mb-3.5">
                <div className="w-18 h-18 rounded-lg bg-gray-200 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-gray-900 mb-1">
                    {selectedPlace.name}
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2">
                    {selectedPlace.formattedAddress}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3.5 border-t border-gray-200">
                {selectedPlace.types && selectedPlace.types.length > 0 && (
                  <div>
                    <div className="text-[11px] text-gray-500 mb-0.5">Category</div>
                    <div className="text-xs font-medium text-gray-900 capitalize">
                      {selectedPlace.types[0].replace(/_/g, ' ')}
                    </div>
                  </div>
                )}
                {selectedPlace.formattedPhoneNumber && (
                  <div>
                    <div className="text-[11px] text-gray-500 mb-0.5">Phone</div>
                    <div className="text-xs font-medium text-gray-900">
                      {selectedPlace.formattedPhoneNumber}
                    </div>
                  </div>
                )}
                {selectedPlace.rating && (
                  <div>
                    <div className="text-[11px] text-gray-500 mb-0.5">Rating</div>
                    <div className="text-xs font-medium text-gray-900">
                      {selectedPlace.rating} ⭐ ({selectedPlace.userRatingsTotal})
                    </div>
                  </div>
                )}
                {selectedPlace.openingHours && (
                  <div>
                    <div className="text-[11px] text-gray-500 mb-0.5">Status</div>
                    <div className="text-xs font-medium text-gray-900">
                      {selectedPlace.openingHours.openNow ? 'Open now' : 'Closed'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 flex gap-2.5 justify-end bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddLocation}
            disabled={!selectedPlace || isLoading || showSuccess}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-coral-500 hover:bg-coral-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            style={{
              backgroundColor: selectedPlace && !isLoading && !showSuccess ? '#f59e8d' : undefined,
            }}
          >
            {showSuccess ? 'Added ✓' : 'Add to Guide'}
          </button>
        </div>
      </div>
    </div>
  );
}
