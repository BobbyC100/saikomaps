'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { GlobalHeader } from '@/components/layouts/GlobalHeader';
import { GlobalFooter } from '@/components/layouts/GlobalFooter';
import { MapCard } from '@/components/ui/MapCard';
import { useExploreMaps } from '@/hooks/useExploreMaps';
import styles from './explore.module.css';

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') || '';

  const [searchInput, setSearchInput] = useState(urlQuery);
  const {
    maps,
    pagination,
    isLoading,
    error,
    filters,
    setFilters,
    loadMore,
  } = useExploreMaps({ q: urlQuery || undefined });

  useEffect(() => {
    setSearchInput(urlQuery);
    setFilters((prev) => ({ ...prev, q: urlQuery || undefined }));
  }, [urlQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, q: searchInput });
  };

  const handleSortChange = (sort: 'recent' | 'popular' | 'alphabetical') => {
    setFilters({ ...filters, sort });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setFilters({});
  };

  const isSortActive = (sort: 'recent' | 'popular' | 'alphabetical') => {
    if (sort === 'recent') return !filters.sort || filters.sort === 'recent';
    return filters.sort === sort;
  };

  return (
    <div className={styles.pageWrapper}>
      <GlobalHeader variant="default" />

      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.title}>Explore</h1>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className={styles.searchBar}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search maps, places, neighborhoods..."
              className={styles.searchInput}
            />
          </form>
        </header>

        {/* Sort Controls */}
        <div className={styles.controls}>
          <div className={styles.sortGroup}>
            <span className={styles.sortLabel}>Sort:</span>
            <button
              onClick={() => handleSortChange('recent')}
              className={`${styles.sortBtn} ${isSortActive('recent') ? styles.sortBtnActive : ''}`}
            >
              Recent
            </button>
            <button
              onClick={() => handleSortChange('popular')}
              className={`${styles.sortBtn} ${isSortActive('popular') ? styles.sortBtnActive : ''}`}
            >
              Popular
            </button>
            <button
              onClick={() => handleSortChange('alphabetical')}
              className={`${styles.sortBtn} ${isSortActive('alphabetical') ? styles.sortBtnActive : ''}`}
            >
              A–Z
            </button>
          </div>

          {pagination && (
            <span className={styles.resultCount}>
              {pagination.total} {pagination.total === 1 ? 'map' : 'maps'}
            </span>
          )}
        </div>

        {/* Maps Grid */}
        {error ? (
          <div className={styles.errorState}>
            <p>{error}</p>
            <button onClick={handleClearFilters}>Clear filters</button>
          </div>
        ) : isLoading && maps.length === 0 ? (
          <div className={styles.loadingState}>
            <p>Loading maps...</p>
          </div>
        ) : maps.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No maps found.</p>
            {(filters.q || filters.neighborhood || filters.category) && (
              <button onClick={handleClearFilters}>Clear filters</button>
            )}
          </div>
        ) : (
          <>
            <div className={styles.mapGrid}>
              {maps.map((map) => (
                <MapCard
                  key={map.id}
                  id={map.id}
                  title={map.title}
                  slug={map.slug}
                  placeCount={map.placeCount}
                  coverPhotos={map.coverPhotos}
                  curatorName={map.curatorName}
                />
              ))}
            </div>

            {/* Load More */}
            {pagination?.hasMore && (
              <div className={styles.loadMore}>
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className={styles.loadMoreBtn}
                >
                  {isLoading ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <GlobalFooter variant="standard" />
    </div>
  );
}
