'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import styles from './setup.module.css';

export default function SetupPage() {
  const router = useRouter();
  const [mapTitle, setMapTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [locationCount, setLocationCount] = useState(0);

  useEffect(() => {
    // Check if locations exist in localStorage
    const storedLocations = localStorage.getItem('importedLocations');
    if (!storedLocations) {
      router.push('/import');
      return;
    }

    try {
      const locations = JSON.parse(storedLocations);
      setLocationCount(locations.length);
    } catch (error) {
      console.error('Error loading locations:', error);
      router.push('/import');
    }
  }, [router]);

  const handleCreateMap = async () => {
    if (!mapTitle.trim()) {
      alert('Please enter a map title');
      return;
    }

    const storedLocations = localStorage.getItem('importedLocations');
    if (!storedLocations) {
      alert('No locations found. Please import locations first.');
      router.push('/import');
      return;
    }

    setIsCreating(true);

    try {
      const locations = JSON.parse(storedLocations);
      
      
      // Transform locations to API format
      const apiLocations = locations.map((loc: any) => ({
        name: loc.Title || loc.Name || loc.name || 'Untitled Location',
        address: loc.Address || loc.address,
        url: loc.URL || loc.url,
        comment: loc.Comment || loc.Note || loc.comment,
      })).filter((loc: any) => loc.name && loc.name.trim() !== '');
      

      // Call API to create map (auto-published)
      const requestBody = {
        listTitle: mapTitle.trim(),
        templateType: 'field-notes',
        locations: apiLocations,
      };
      
      
      // Show processing state
      setIsCreating(true);
      
      const response = await fetch('/api/import/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create map');
      }

      // Clear imported locations
      localStorage.removeItem('importedLocations');
      
      // Redirect to editor so user can complete map setup (places are already in the list)
      if (result.data?.listId) {
        router.push(`/maps/${result.data.listId}/edit`);
      } else if (result.data?.slug) {
        router.push(`/map/${result.data.slug}`);
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error creating map:', error);
      alert(`Failed to create map: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsCreating(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <Link href="/import" className={styles.navLeft}>
          <ArrowLeft size={20} />
          Back to Import
        </Link>
      </nav>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Setup Your Map</h1>
          <p className={styles.pageSubtitle}>
            {locationCount > 0 ? `${locationCount} locations ready` : 'Almost there!'}
          </p>
        </div>

        <div className={styles.content}>
          {/* Map Title */}
          <div className={styles.section}>
            <label className={styles.label}>
              Map Title <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={mapTitle}
              onChange={(e) => setMapTitle(e.target.value)}
              placeholder="e.g., Biarritz Beach Spots"
              className={styles.input}
              autoFocus
              disabled={isCreating}
            />
            <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.5)' }}>
              Using Field Notes template
            </p>
          </div>

          {/* Description (Optional) */}
          <div className={styles.section}>
            <label className={styles.label}>Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your map..."
              className={styles.textarea}
              rows={3}
              disabled={isCreating}
            />
          </div>

          {/* Create Button */}
          <div className={styles.actions}>
            {isCreating ? (
              <div className={styles.processingState}>
                <div className={styles.spinner}></div>
                <div>
                  <div className={styles.processingTitle}>Processing locations...</div>
                  <div className={styles.processingSubtitle}>
                    Enriching with Google Places data (this may take a moment)
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleCreateMap}
                disabled={!mapTitle.trim()}
                className={styles.createButton}
              >
                Create Map
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
